import ObjectDetection from "@/components/object-detection";

export default function Home() {
  return (
    <main className="min-h-svh px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-4 sm:pb-5 md:flex-row md:items-end">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-emerald-200 sm:text-xs sm:tracking-[0.22em]">
              Browser AI Vision
            </p>
            <h1 className="gradient-title mt-2 text-3xl font-black tracking-wide sm:mt-3 md:text-4xl lg:text-5xl">
              Object Detector
            </h1>
            <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-transparent sm:mt-3 sm:w-28" />
          </div>
          <p className="w-fit rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-cyan-100 sm:text-sm">
            COCO-SSD / MobileNet v2
          </p>
        </header>

        <ObjectDetection />
      </div>
    </main>
  );
}
