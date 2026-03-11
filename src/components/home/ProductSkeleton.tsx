"use client";

export const ProductSkeleton = () => {
    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-gray-50 animate-pulse">
            {/* Image Skeleton */}
            <div className="relative aspect-[4/5] bg-gray-100" />

            <div className="p-3 flex flex-col flex-1">
                {/* Title Skeleton */}
                <div className="h-3 bg-gray-100 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2 mb-4" />

                {/* Rating Skeleton */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 bg-gray-100 rounded-full w-8" />
                    <div className="h-3 bg-gray-100 rounded-full w-12" />
                </div>

                {/* Price Skeleton */}
                <div className="mt-auto flex flex-col gap-2 mb-3">
                    <div className="h-2 bg-gray-100 rounded-full w-16" />
                    <div className="h-4 bg-gray-100 rounded-full w-24" />
                </div>
            </div>

            {/* Button Skeleton */}
            <div className="px-3 pb-3">
                <div className="w-full h-[42px] bg-gray-100 rounded-xl" />
            </div>
        </div>
    );
};
