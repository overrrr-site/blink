import { useNavigate } from 'react-router-dom';
import DogSelectSection from '../components/DogSelectSection';
import ReservationFormFields from '../components/ReservationFormFields';
import ReservationFooter from '../components/ReservationFooter';
import { useLiffReservationCreate } from '../hooks/useLiffReservationCreate';

export default function ReservationCreate() {
  const navigate = useNavigate();
  const { dogs, loading, saving, formData, setFormData, handleSubmit } = useLiffReservationCreate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <iconify-icon
          icon="solar:spinner-bold"
          width="48"
          height="48"
          class="text-primary animate-spin"
        ></iconify-icon>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-36">
      {/* ヘッダー（戻るボタン付き） */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">新規予約</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <DogSelectSection
          dogs={dogs}
          selectedDogId={formData.dog_id}
          onChange={(dogId) => setFormData((prev) => ({ ...prev, dog_id: dogId }))}
        />
        <ReservationFormFields
          formData={formData}
          onChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
        />
      </form>

      <ReservationFooter
        isSaving={saving}
        isDisabled={!formData.dog_id}
        onSubmit={async () => {
          const success = await handleSubmit()
          if (success) {
            navigate('/home/reservations')
          }
        }}
      />
    </div>
  );
}
