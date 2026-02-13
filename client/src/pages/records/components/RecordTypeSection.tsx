import type { RecordType, DaycareData, GroomingData, HotelData } from '../../../types/record'
import RequiredSection from './RequiredSection'
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
  if (recordType === 'daycare') {
    return (
      <>
        <RequiredSection title="トレーニング記録">
          <DaycareForm data={daycareData} onChange={onDaycareChange} storeId={storeId} />
        </RequiredSection>
        <RequiredSection title="ごはん・トイレ">
          <DaycareCareForm data={daycareData} onChange={onDaycareChange} />
        </RequiredSection>
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
