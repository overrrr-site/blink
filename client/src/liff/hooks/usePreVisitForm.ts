import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { getAxiosErrorMessage } from '../../utils/error';
import { useToast } from '../../components/Toast';
import { DEFAULT_DAYCARE_DATA } from '../../types/daycarePreVisit';
import { useLiffAuthStore } from '../store/authStore';
import type { RecordType } from '../../types/record';
import type {
  PreVisitReservation,
  GroomingPreVisitData,
  HotelPreVisitData,
} from '../components/previsit/types';
import {
  DEFAULT_GROOMING_DATA,
  DEFAULT_HOTEL_DATA,
  normalizeGroomingPreVisitData,
} from '../components/previsit/types';

const GUIDE_BANNER_KEY = 'blink_previsit_guide_dismissed';
const SECTION_HINTS_KEY = 'blink_previsit_section_hints_dismissed';

export function usePreVisitForm(reservationId: string | undefined) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const selectedBusinessType = useLiffAuthStore((s) => s.selectedBusinessType || s.owner?.primaryBusinessType || 'daycare');
  const serviceType: RecordType = selectedBusinessType || 'daycare';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingLastRecord, setLoadingLastRecord] = useState(false);
  const [reservation, setReservation] = useState<PreVisitReservation | null>(null);
  const [daycareData, setDaycareData] = useState(DEFAULT_DAYCARE_DATA);
  const [groomingData, setGroomingData] = useState<GroomingPreVisitData>(DEFAULT_GROOMING_DATA);
  const [hotelData, setHotelData] = useState<HotelPreVisitData>(DEFAULT_HOTEL_DATA);
  const [showGuideBanner, setShowGuideBanner] = useState(() => !localStorage.getItem(GUIDE_BANNER_KEY));
  const [showSectionHints] = useState(() => !localStorage.getItem(SECTION_HINTS_KEY));
  const [hasLastRecord, setHasLastRecord] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await liffClient.get('/reservations');
        const responseData = response.data as { data: PreVisitReservation[] } | PreVisitReservation[];
        const reservations = Array.isArray(responseData) ? responseData : responseData.data;
        const res = reservations.find((r) => r.id === parseInt(reservationId || '0'));
        if (res) {
          setReservation(res);

          if (res.has_pre_visit_input) {
            const savedServiceType: RecordType = res.pre_visit_service_type || res.service_type || 'daycare';
            if (savedServiceType === 'daycare' && res.daycare_data) {
              setDaycareData({
                ...DEFAULT_DAYCARE_DATA,
                ...res.daycare_data,
              });
            }
            if (savedServiceType === 'grooming') {
              setGroomingData(normalizeGroomingPreVisitData(res.grooming_data));
            }
            if (savedServiceType === 'hotel') {
              setHotelData({
                ...DEFAULT_HOTEL_DATA,
                ...(res.hotel_data || {}),
              });
            }
          }

          if (res.dog_id) {
            try {
              await liffClient.get(`/pre-visit-inputs/latest/${res.dog_id}`, {
                params: { service_type: selectedBusinessType || 'daycare' },
              });
              setHasLastRecord(true);
            } catch {
              setHasLastRecord(false);
            }
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId, selectedBusinessType]);

  useEffect(() => {
    if (!loading && showSectionHints) {
      localStorage.setItem(SECTION_HINTS_KEY, '1');
    }
  }, [loading, showSectionHints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        reservation_id: parseInt(reservationId),
        service_type: serviceType,
      };

      if (serviceType === 'daycare') {
        Object.assign(payload, {
          daycare_data: daycareData,
        });
      }

      if (serviceType === 'grooming') {
        Object.assign(payload, {
          grooming_data: {
            counseling: {
              style_request: groomingData.counseling?.style_request || '',
              caution_notes: groomingData.counseling?.caution_notes || '',
              condition_notes: groomingData.counseling?.condition_notes || '',
              consent_confirmed: groomingData.counseling?.consent_confirmed || false,
            },
            pre_visit: {
              pickup_time: groomingData.pre_visit?.pickup_time || '',
              completion_contact: groomingData.pre_visit?.completion_contact || 'line',
              day_of_notes: groomingData.pre_visit?.day_of_notes || '',
            },
          },
        });
      }

      if (serviceType === 'hotel') {
        Object.assign(payload, {
          hotel_data: hotelData,
        });
      }

      await liffClient.post('/pre-visit-inputs', {
        ...payload,
      });
      navigate('/home');
    } catch (error) {
      showToast(getAxiosErrorMessage(error, '事前入力の保存に失敗しました'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateHotelFeeding = (field: 'morning' | 'evening' | 'snack', value: string) => {
    setHotelData(prev => ({
      ...prev,
      feeding_schedule: {
        ...prev.feeding_schedule,
        [field]: value,
      },
    }));
  };

  const updateHotelMedication = (field: 'has_medication' | 'details', value: boolean | string) => {
    setHotelData(prev => ({
      ...prev,
      medication: {
        ...prev.medication,
        [field]: value,
      },
    }));
  };

  const handleFillFromLastRecord = async () => {
    if (!reservation?.dog_id) return;
    setLoadingLastRecord(true);
    try {
      const response = await liffClient.get(`/pre-visit-inputs/latest/${reservation.dog_id}`, {
        params: { service_type: serviceType },
      });
      const lastRecord = response.data;
      if (serviceType === 'daycare' && lastRecord.daycare_data) {
        setDaycareData({
          ...DEFAULT_DAYCARE_DATA,
          ...lastRecord.daycare_data,
        });
      }
      if (serviceType === 'grooming') {
        setGroomingData(normalizeGroomingPreVisitData(lastRecord.grooming_data));
      }
      if (serviceType === 'hotel') {
        setHotelData({
          ...DEFAULT_HOTEL_DATA,
          ...(lastRecord.hotel_data || {}),
        });
      }
    } catch {
      // 過去の登園前入力がない場合は何もしない
    } finally {
      setLoadingLastRecord(false);
    }
  };

  const dismissGuideBanner = () => {
    setShowGuideBanner(false);
    localStorage.setItem(GUIDE_BANNER_KEY, '1');
  };

  return {
    loading,
    saving,
    loadingLastRecord,
    reservation,
    serviceType,
    daycareData,
    setDaycareData,
    groomingData,
    setGroomingData,
    hotelData,
    setHotelData,
    showGuideBanner,
    showSectionHints,
    hasLastRecord,
    handleSubmit,
    updateHotelFeeding,
    updateHotelMedication,
    handleFillFromLastRecord,
    dismissGuideBanner,
  };
}
