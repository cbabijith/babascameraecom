"use client";

export default function ProductDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width pt-3 sm:pt-6">
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="constrained-width py-8 pb-24 md:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left */}
          <div className="space-y-6">
            <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden animate-pulse" />
            <div className="grid grid-cols-3 gap-4 pt-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-3 w-24 mx-auto bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <div className="hidden lg:block">
              <div className="h-8 w-3/4 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            </div>

            <div>
              <div className="hidden lg:flex items-center gap-4 mb-2">
                <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-6 w-28 bg-gray-100 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
              <div className="h-6 w-40 bg-gray-100 rounded animate-pulse mt-2" />
            </div>

            <div className="hidden md:flex gap-4">
              <div className="h-10 w-full bg-gray-100 rounded-full animate-pulse" />
              <div className="h-10 w-full bg-gray-100 rounded-full animate-pulse" />
            </div>

            <div>
              <div className="h-5 w-28 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>

            <div>
              <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-[2px] w-24 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded rounded-[14px] md:rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
