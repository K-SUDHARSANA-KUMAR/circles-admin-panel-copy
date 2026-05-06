'use client';

import signInCover from '@/assets/pngs/naga-cover.png';
import quoteLine from '@/assets/pngs/quote-line.png';
import { TextAnimate } from '@/components/magicui/text-animate';

export const AuthHero = () => {
  return (
    <div
      className="bg-freshleaf relative hidden h-1/2 w-full flex-col items-center justify-center bg-contain bg-center bg-no-repeat px-20 md:flex md:h-auto md:w-1/2"
      style={{ backgroundImage: `url(${signInCover.src})` }}
    >
      <div className="text-centerflex flex h-fit flex-col gap-10 text-center text-neutral-200">
        <div>
          <img src={quoteLine.src} alt="quote-line" className="h-auto w-full" />
        </div>
        <div className="space-y-2">
          <TextAnimate
            className="text-3xl font-semibold"
            animation="blurInUp"
            by="character"
            once
          >
            Welcome to Naga Limited
          </TextAnimate>
          <TextAnimate
            className="px-20 text-base"
            animation="blurInUp"
            by="line"
            as="p"
            delay={0.5}
            once
          >
            {`Please log in to access your dashboard and manage your operations efficiently.`}
          </TextAnimate>
        </div>

        <div>
          <img
            src={quoteLine.src}
            alt="quote-line"
            className="h-auto w-full rotate-180"
          />
        </div>
      </div>

      <div className="absolute right-0 bottom-6 left-0 flex flex-col items-center justify-center gap-1 text-white">
        <div className="text-base">Since 1962</div>
        <div className="text-xs">Powering Food, Hygiene, Minerals</div>
      </div>

      <div className="absolute top-0 left-0">
        <div>
          <div className="grid grid-cols-7 grid-rows-6 gap-1">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={index}
                className="h-2 w-2 rounded-full bg-neutral-100 opacity-90"
              ></div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute right-0 bottom-0">
        <div>
          <div className="grid rotate-180 grid-cols-7 grid-rows-6 gap-1">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={index}
                className="h-2 w-2 rounded-full bg-neutral-100 opacity-90"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
