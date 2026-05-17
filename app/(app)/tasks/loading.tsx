function TaskSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="w-1 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className={`h-4 rounded bg-gray-200 dark:bg-gray-700 ${wide ? 'w-4/5' : 'w-3/5'}`} />
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

export default function TasksLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="h-7 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-28 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex gap-2">
          {[80, 48, 48, 48].map((w, i) => (
            <div key={i} className="h-6 rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 px-4 py-4 space-y-6">
        <section>
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="space-y-2">
            <TaskSkeleton wide />
            <TaskSkeleton />
          </div>
        </section>
        <section>
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="space-y-2">
            <TaskSkeleton />
            <TaskSkeleton wide />
            <TaskSkeleton />
          </div>
        </section>
      </div>
    </div>
  )
}
