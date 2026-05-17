const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-24 rounded-xl bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-300 dark:text-gray-600">{d}</div>
          ))}
        </div>

        {/* 6-week grid */}
        <div className="grid grid-cols-7 flex-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="border-r border-b border-gray-100 dark:border-gray-700/50 p-1">
              <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 mb-1" />
              {i % 5 === 2 && <div className="h-4 rounded bg-blue-100 dark:bg-blue-900/20 mb-0.5 mx-0.5" />}
              {i % 8 === 1 && <div className="h-4 rounded bg-green-100 dark:bg-green-900/20 mx-0.5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
