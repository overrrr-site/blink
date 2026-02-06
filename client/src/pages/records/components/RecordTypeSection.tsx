import type { RecordType, DaycareData, GroomingData, HotelData } from '../../../types/record'
import RequiredSection from './RequiredSection'
import DaycareForm from './DaycareForm'
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
}

const RecordTypeSection = ({
  recordType,
  daycareData,
  groomingData,
  hotelData,
  onDaycareChange,
  onGroomingChange,
  onHotelChange,
}: RecordTypeSectionProps) => {
  const title = recordType === 'daycare' ? '今日の活動' : recordType === 'grooming' ? 'カット内容' : '宿泊情報'

  return (
    <RequiredSection title={title}>
      {recordType === 'daycare' && (
        <DaycareForm data={daycareData} onChange={onDaycareChange} />
      )}
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
