import { useMemo, useState } from 'react'
import type { RecordType, DaycareData, GroomingData, HotelData } from '../../../types/record'
import RequiredSection from './RequiredSection'
import OptionalSection from './OptionalSection'
import DaycareForm from './DaycareForm'
import DaycareCareForm from './DaycareCareForm'
import GroomingForm from './GroomingForm'
import HotelForm from './HotelForm'
import { getRecordTypeSectionTitle, isDaycareRecordType } from '../utils/recordTypeSection'

interface RecordTypeSectionProps {
  recordType: RecordType
  daycareData: DaycareData
  groomingData: GroomingData
  hotelData: HotelData
  onDaycareChange: (data: DaycareData) => void
  onGroomingChange: (data: GroomingData) => void
  onHotelChange: (data: HotelData) => void
  storeId: number
}

const RecordTypeSection = ({
  recordType,
  daycareData,
  groomingData,
  hotelData,
  onDaycareChange,
  onGroomingChange,
  onHotelChange,
  storeId,
}: RecordTypeSectionProps) => {
  const [careCollapsed, setCareCollapsed] = useState(true)

  const careSummary = useMemo(() => {
    const parts: string[] = []
    if (daycareData.meal?.morning?.trim() || daycareData.meal?.afternoon?.trim()) {
      parts.push('ごはん入力済み')
    }
    const toiletEntries = daycareData.toilet ? Object.values(daycareData.toilet) : []
    if (toiletEntries.some(e => e.urination || e.defecation)) {
      parts.push('トイレ入力済み')
    }
    return parts.length > 0 ? parts.join(' / ') : '未入力'
  }, [daycareData.meal, daycareData.toilet])

  if (isDaycareRecordType(recordType)) {
    return (
      <>
        <RequiredSection title="トレーニング記録">
          <DaycareForm data={daycareData} onChange={onDaycareChange} storeId={storeId} />
        </RequiredSection>
        <OptionalSection
          title="ごはん・トイレ"
          collapsed={careCollapsed}
          onToggle={() => setCareCollapsed((s) => !s)}
          summary={careSummary}
        >
          <DaycareCareForm data={daycareData} onChange={onDaycareChange} />
        </OptionalSection>
      </>
    )
  }

  const title = getRecordTypeSectionTitle(recordType)

  return (
    <RequiredSection title={title}>
      {recordType === 'grooming' && (
        <GroomingForm data={groomingData} onChange={onGroomingChange} />
      )}
      {recordType === 'hotel' && (
        <HotelForm data={hotelData} onChange={onHotelChange} />
      )}
    </RequiredSection>
  )
}

export default RecordTypeSection
