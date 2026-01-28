import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

function getContractTypeStyle(contractType: string): string {
  switch (contractType) {
    case '月謝制':
      return 'bg-chart-2/10 text-chart-2'
    case 'チケット制':
      return 'bg-chart-4/10 text-chart-4'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function PricingTab() {
  const navigate = useNavigate()
  const [courseList, setCourseList] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    try {
      const response = await api.get('/course-masters')
      setCourseList(response.data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoadingCourses(false)
    }
  }

  async function handleDeleteCourse(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('このコースを削除しますか？')) {
      return
    }

    try {
      await api.delete(`/course-masters/${id}`)
      fetchCourses()
    } catch (error: any) {
      console.error('Error deleting course:', error)
      alert(error.response?.data?.error || 'コースの削除に失敗しました')
    }
  }

  return (
    <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold font-heading flex items-center gap-2">
          <Icon icon="solar:tag-price-bold" width="16" height="16" className="text-chart-4" />
          コース・料金設定
        </h2>
        <button
          onClick={() => navigate('/settings/courses/new')}
          className="text-xs font-bold text-primary flex items-center gap-1"
        >
          <Icon icon="solar:add-circle-bold" width="14" height="14" />
          追加
        </button>
      </div>
      {loadingCourses ? (
        <div className="text-center py-4">
          <span className="text-xs text-muted-foreground">読み込み中...</span>
        </div>
      ) : courseList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Icon icon="solar:tag-price-bold" width="48" height="48" className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">コースが登録されていません</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {courseList.map((course) => (
            <div
              key={course.id}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
            >
              <div
                className="flex-1 text-left cursor-pointer"
                onClick={() => navigate(`/settings/courses/${course.id}`)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium block">{course.course_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getContractTypeStyle(course.contract_type)}`}>
                    {course.contract_type}
                  </span>
                  {!course.enabled && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      無効
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {course.sessions && `${course.sessions}回 / `}
                  ¥{Math.floor(course.price ?? 0).toLocaleString()}
                  {course.valid_days && ` / 有効期限${course.valid_days}日`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/settings/courses/${course.id}`)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label={`${course.course_name}の詳細`}
                >
                  <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => handleDeleteCourse(course.id, e)}
                  className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                  aria-label={`${course.course_name}を削除`}
                >
                  <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default PricingTab
