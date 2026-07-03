import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["timeless", "authentic", "eternal", "luxurious", "handcrafted"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full flex justify-center px-4 sm:px-6">
      <div className="container flex justify-center min-w-0">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col text-center min-w-0 w-full">
          <div>
            <Button variant="secondary" size="sm" className="gap-4">
              Read Our Story <MoveRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-4 flex-col items-center min-w-0 w-full">
            <h1 className="text-4xl sm:text-5xl md:text-7xl max-w-3xl tracking-tighter text-center font-regular">
              <span className="text-spektr-cyan-50">TIBR is</span>
              <span className="relative flex w-full min-w-[240px] md:min-w-[460px] min-h-[1.3em] justify-center overflow-y-hidden text-center mt-4 md:mt-6">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute left-1/2 whitespace-nowrap font-semibold"
                    style={{ x: "-50%" }}
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center min-w-0 w-full">
              Handcrafted extraits de parfum inspired by the heritage of
              Egypt — meticulous by hand, born from authenticity, nostalgia,
              and luxury.
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button size="lg" className="gap-4" variant="outline">
              Our Story <MoveRight className="w-4 h-4" />
            </Button>
            <Button size="lg" className="gap-4">
              Explore the Collection <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
