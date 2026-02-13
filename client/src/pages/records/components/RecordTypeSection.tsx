import { useState } from 'react'
import type { RecordType, DaycareData, GroomingData, HotelData } from '../../../types/record'
import RequiredSection from './RequiredSection'
import OptionalSection from './OptionalSection'
import DaycareForm from './DaycareForm'
import DaycareCareForm from './DaycareCareForm'
import GroomingForm from './GroomingForm'
import HotelForm from './HotelForm'

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

  if (recordType === 'daycare') {
    return (
      <>
        <RequiredSection title="トレーニング記録">
          <DaycareForm data={daycareData} onChange={onDaycareChange} storeId={storeId} />
        </RequiredSection>
        <OptionalSection
          title="ごはん・トイレ"
          collapsed={careCollapsed}
          onToggle={() => setCareCollapsed((s) => !s)}
        >
          <DaycareCareForm data={daycareData} onChange={onDaycareChange} />
        </OptionalSection>
      </>
    )
  }

  const title = recordType === 'grooming' ? 'カット内容' : '宿泊情報'

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
