export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b h-14" />
      <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-16 bg-gray-200 rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
