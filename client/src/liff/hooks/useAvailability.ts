import { useState, useEffect } from 'react';
import liffClient from '../api/client';

type AvailabilityData = {
  date: string;
  available: number;
  capacity: number;
  isClosed: boolean;
};

type AvailabilityResponse = {
  month: string;
  availability: AvailabilityData[];
  businessHours: Record<string, any>;
  closedDays: string[];
};

export function useAvailability(month: string) {
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return;

    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await liffClient.get(`/availability?month=${month}`);
        setData(response.data);
      } catch (err: any) {
        console.error('Failed to fetch availability:', err);
        setError(err.response?.data?.error || '空き状況の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [month]);

  const getAvailabilityForDate = (date: string): AvailabilityData | null => {
    if (!data) return null;
    return data.availability.find((a) => a.date === date) || null;
  };

  return {
    data,
    loading,
    error,
    getAvailabilityForDate,
  };
}
