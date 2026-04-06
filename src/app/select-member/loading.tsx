export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 animate-pulse">
      <div className="w-full max-w-sm space-y-3">
        <div className="h-8 bg-gray-200 rounded-xl mx-auto w-48" />
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
        <div className="mt-6 space-y-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
