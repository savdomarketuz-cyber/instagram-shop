export default function Loading() {
    return (
        <div className="min-h-screen bg-white font-sans animate-page-in">
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -400px 0; }
                    100% { background-position: 400px 0; }
                }
                .skeleton-shimmer {
                    background: linear-gradient(90deg, #f5f5f5 25%, #ececec 37%, #f5f5f5 63%);
                    background-size: 800px 100%;
                    animation: shimmer 1.6s ease-in-out infinite;
                }
            `}</style>

            {/* Desktop Skeleton */}
            <div className="hidden md:block max-w-[1440px] mx-auto px-10 py-12">
                <div className="h-4 skeleton-shimmer rounded-full w-48 mb-10" />
                <div className="grid grid-cols-12 gap-16">
                    <div className="col-span-12 lg:col-span-7 flex gap-6 h-[700px]">
                        <div className="w-24 shrink-0 space-y-4">
                            {[0,1,2,3,4].map(i => <div key={i} className="aspect-square skeleton-shimmer rounded-2xl" style={{ animationDelay: `${i * 0.1}s` }} />)}
                        </div>
                        <div className="flex-1 skeleton-shimmer rounded-[40px]" />
                    </div>
                    <div className="col-span-12 lg:col-span-5 space-y-8">
                        <div className="p-10 rounded-[40px] border border-gray-100/50 space-y-6">
                            <div className="h-10 skeleton-shimmer rounded-2xl w-[85%]" style={{ animationDelay: '0.1s' }} />
                            <div className="h-5 skeleton-shimmer rounded-full w-32" style={{ animationDelay: '0.2s' }} />
                            <div className="h-14 skeleton-shimmer rounded-2xl w-[60%]" style={{ animationDelay: '0.3s' }} />
                            <div className="h-32 skeleton-shimmer rounded-[32px]" style={{ animationDelay: '0.4s' }} />
                            <div className="flex gap-3">
                                <div className="h-14 skeleton-shimmer rounded-2xl flex-1" style={{ animationDelay: '0.5s' }} />
                                <div className="h-14 skeleton-shimmer rounded-2xl flex-1" style={{ animationDelay: '0.6s' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Skeleton */}
            <div className="md:hidden">
                <div className="relative">
                    <div className="w-full aspect-[3/4] skeleton-shimmer" />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className="w-11 h-11 rounded-full skeleton-shimmer" />
                        <div className="w-11 h-11 rounded-full skeleton-shimmer" style={{ animationDelay: '0.1s' }} />
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <div className="w-11 h-11 rounded-full skeleton-shimmer" style={{ animationDelay: '0.2s' }} />
                        <div className="w-11 h-11 rounded-full skeleton-shimmer" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
                        {[0,1,2,3].map(i => <div key={i} className={`h-1 rounded-full skeleton-shimmer ${i === 0 ? 'w-6' : 'w-1'}`} style={{ animationDelay: `${i * 0.1}s` }} />)}
                    </div>
                </div>
                
                <div className="px-6 pt-8 space-y-5">
                    <div className="h-7 skeleton-shimmer rounded-xl w-36" style={{ animationDelay: '0.2s' }} />
                    <div className="space-y-2">
                        <div className="h-6 skeleton-shimmer rounded-xl w-[90%]" style={{ animationDelay: '0.3s' }} />
                        <div className="h-6 skeleton-shimmer rounded-xl w-[60%]" style={{ animationDelay: '0.35s' }} />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-4 skeleton-shimmer rounded-full w-24" style={{ animationDelay: '0.4s' }} />
                        <div className="h-4 skeleton-shimmer rounded-full w-16" style={{ animationDelay: '0.45s' }} />
                    </div>
                    <div className="h-14 skeleton-shimmer rounded-3xl" style={{ animationDelay: '0.5s' }} />
                    <div className="h-20 skeleton-shimmer rounded-[32px]" style={{ animationDelay: '0.55s' }} />
                    <div className="h-28 skeleton-shimmer rounded-[40px]" style={{ animationDelay: '0.6s' }} />
                </div>
            </div>
        </div>
    );
}
