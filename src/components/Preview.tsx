import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download as DownloadIcon, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import * as Slider from 'react-compare-slider/components';
import { useReactCompareSlider } from 'react-compare-slider/hooks';
import Background from './Background';
import type { CanvasType } from '../assets/script/inference';
import inference, {
  canvasToBlob,
  createCanvas,
} from '../assets/script/inference';

interface PreviewComponentProps {
  originUrl: string;
  originName: string;
  onClick: (type: 'delete') => void;
}

let originWidth: number;
let originHeight: number;
let handledImgBgColor = '';

const calcCanvasShape: (w: number, h: number) => [number, number] = (w, h) => {
  let canvasWidth: number;
  let canvasHeight: number;
  if (w < h) {
    canvasHeight = Math.floor(Math.min(window.innerHeight * 0.7, h));
    canvasWidth = Math.floor((canvasHeight * w) / h);
  } else {
    canvasWidth = Math.floor(Math.min(window.innerWidth * 0.6, w));
    canvasHeight = Math.floor((canvasWidth * h) / w);
  }
  return [canvasWidth, canvasHeight];
};

const downloadImage = (
  handledImgUrl: string,
  name: string,
  onDone?: () => void
) => {
  const canvas: CanvasType = createCanvas(originWidth, originHeight);
  const ctx = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  const img = new Image();
  img.onload = async () => {
    if (
      handledImgBgColor &&
      (handledImgBgColor.indexOf('#') > -1 ||
        handledImgBgColor === 'transparent')
    ) {
      ctx.fillStyle = handledImgBgColor;
      ctx.fillRect(0, 0, originWidth, originHeight);
    }
    ctx.drawImage(img, 0, 0, originWidth, originHeight);
    const imageBlob = await canvasToBlob(canvas, {
      quality: 0.8,
      type: 'image/png',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(imageBlob);
    link.download = `${name}_rbg.png`;

    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    setTimeout(() => {
      link.remove();
    }, 100);
    onDone?.();
  };
  img.src = handledImgUrl;
};

const Preview: React.FC<PreviewComponentProps> = ({
  originUrl,
  originName,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slider = useReactCompareSlider();
  const sliderRef = useRef(slider);
  const [aspect, setAspect] = useState(1);
  const [handledUrl, setHandledUrl] = useState('');
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>(
    'processing'
  );

  useEffect(() => {
    sliderRef.current = slider;
  });

  const fireTransition = useCallback(async () => {
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          sliderRef.current.setPosition(90);
          resolve(true);
        }, 750);
      })
    );
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          sliderRef.current.setPosition(10);
          resolve(true);
        }, 750);
      })
    );
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          sliderRef.current.setPosition(50);
          resolve(true);
        }, 750);
      })
    );
  }, []);

  const draw = useCallback((dataUrl: string, background = '') => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && dataUrl) {
      ctx.clearRect(
        0,
        0,
        canvasRef.current?.width || 0,
        canvasRef.current?.height || 0
      );

      const img = new Image();
      img.onload = async () => {
        let width = 0;
        let height = 0;
        if (canvasRef.current?.width && canvasRef.current?.height) {
          width = canvasRef.current?.width;
          height = canvasRef.current?.height;
        } else {
          if (canvasRef.current) {
            originWidth = img.width;
            originHeight = img.height;
            [width = 0, height = 0] = calcCanvasShape(
              originWidth,
              originHeight
            );
          }
        }
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          if (width && height) setAspect(width / height);
        }
        if (
          background &&
          (background.indexOf('#') > -1 || background === 'transparent')
        ) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = dataUrl;
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      // canvasRef.current.width = 0;
      canvasRef.current.height = 0;
    }
  }, []);

  useEffect(() => {
    // origin image
    draw(originUrl);

    // handle image
    inference(originUrl)
      .then((res) => {
        if (!res) return;
        const blobURL = URL.createObjectURL(res);
        draw(blobURL);
        setStatus('done');
        setHandledUrl(blobURL);
        fireTransition();
      })
      .catch((error) => {
        console.error(error);
        setStatus('error');
        toast.error("Couldn't remove the background", {
          description: 'Try a different photo.',
        });
      });
  }, [originUrl, draw, fireTransition]);

  const handleChangeBg = (backgroundColor: string) => {
    sliderRef.current.setPosition(0);
    handledImgBgColor = backgroundColor;
    draw(handledUrl, backgroundColor);
  };

  const downloadHandledImage = () => {
    if (!handledUrl) return;
    downloadImage(handledUrl, originName, () =>
      toast.success('Saved!', {
        description: `${originName}_rbg.png`,
      })
    );
  };

  return (
    <div className='grid items-start gap-6 lg:grid-cols-[1fr_20rem]'>
      <Card>
        <CardHeader>
          <CardTitle className='truncate'>{originName}</CardTitle>
          <CardDescription>
            Drag the slider to see before and after.
          </CardDescription>
          <CardAction>
            {status === 'processing' && (
              <Badge variant='secondary'>
                <Loader2 className='animate-spin' />
                Working on it
              </Badge>
            )}
            {status === 'done' && (
              <Badge>
                <Check />
                Ready
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant='destructive'>{"Didn't work"}</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          <div
            className='relative mx-auto w-full overflow-hidden rounded-lg border'
            style={{
              aspectRatio: aspect,
              maxWidth: `calc(70vh * ${aspect})`,
            }}
          >
            <Slider.Provider {...slider}>
              <Slider.Root
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                }}
              >
                <Slider.Item item='itemOne'>
                  <img
                    src={originUrl}
                    alt='Original photo'
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </Slider.Item>
                <Slider.Item item='itemTwo'>
                  <canvas
                    ref={canvasRef}
                    className='checkerboard'
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </Slider.Item>
                <Slider.HandleRoot>
                  <Slider.Handle />
                </Slider.HandleRoot>
              </Slider.Root>
            </Slider.Provider>

            {status === 'processing' && (
              <div className='absolute inset-0 z-10 flex items-center justify-center'>
                <Skeleton className='absolute inset-0 rounded-none' />
                <div className='relative flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm font-medium shadow-sm'>
                  <Loader2 className='size-4 animate-spin' />
                  Removing the background…
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Background</CardTitle>
          <CardDescription>
            Pick a color to go behind your photo.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-6'>
          <Background onChangeBg={handleChangeBg} />
          <Separator />
          <div className='flex flex-col gap-2'>
            <Button
              size='lg'
              disabled={status !== 'done'}
              onClick={downloadHandledImage}
            >
              <DownloadIcon />
              Download
            </Button>
            <Button
              variant='destructive'
              size='lg'
              onClick={() => onClick('delete')}
            >
              <Trash2 />
              Start over
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Preview;
