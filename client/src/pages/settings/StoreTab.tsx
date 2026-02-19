import { useMemo } from 'react'
import { useAuthStore, selectUser } from '../../store/authStore'
import { useBusinessTypeStore } from '../../store/businessTypeStore'
import { getAvailableBusinessTypes, isBusinessTypeVisible } from '../../utils/businessTypeAccess'
import type { RecordType } from '../../types/record'
import StoreInfoSection from './store/StoreInfoSection'
import BusinessHoursSection from './store/BusinessHoursSection'
import StaffSection from './store/StaffSection'
import TrainingSection from './store/TrainingSection'
import HotelRoomSection from './store/HotelRoomSection'

function StoreTab(): JSX.Element {
  const user = useAuthStore(selectUser)
  const selectedBusinessType = useBusinessTypeStore((s) => s.selectedBusinessType)

  const storeBusinessTypes = useMemo(
    () => ((user?.businessTypes || []) as RecordType[]),
    [user?.businessTypes]
  )

  const availableBusinessTypes = useMemo(() => getAvailableBusinessTypes({
    storeBusinessTypes,
    assignedBusinessTypes: user?.assignedBusinessTypes,
    isOwner: user?.isOwner,
  }), [storeBusinessTypes, user?.assignedBusinessTypes, user?.isOwner])

  const isDaycareEnabled = isBusinessTypeVisible(selectedBusinessType, availableBusinessTypes, 'daycare')
  const isGroomingEnabled = isBusinessTypeVisible(selectedBusinessType, availableBusinessTypes, 'grooming')
  const isHotelEnabled = isBusinessTypeVisible(selectedBusinessType, availableBusinessTypes, 'hotel')

  return (
    <div className="space-y-4">
      <StoreInfoSection
        isDaycareEnabled={isDaycareEnabled}
        isGroomingEnabled={isGroomingEnabled}
      />
      <BusinessHoursSection />
      <StaffSection storeBusinessTypes={storeBusinessTypes} />
      <TrainingSection isDaycareEnabled={isDaycareEnabled} />
      <HotelRoomSection isHotelEnabled={isHotelEnabled} canEdit={Boolean(user?.isOwner)} />
    </div>
  )
}

export default StoreTab
