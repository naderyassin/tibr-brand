import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReviewsSummary } from "@/lib/api";

const REVIEWS = [
  {
    name: "Mohamed Hussein",
    initials: "MH",
    rating: 5,
    text: "Good Winter ,medium to heavy , if you like Amouage perfum you will love this one",
  },
  {
    name: "Mahmoud Ibrahim",
    initials: "MI",
    rating: 4,
    text: "Perfume of chocolate, vanilla ,caramel and coffee Nice gourmet perfume Unisex Good longevity and spillage",
  },
  {
    name: "Michael Louis",
    initials: "ML",
    rating: 5,
    text: "Great This was a great experience",
  },
  {
    name: "Wagdy Amer",
    initials: "WA",
    rating: 5,
    text: "Very nice fragrance, smells premium and relaxing, excellent company, I recommend it.",
  },
  {
    name: "Ahmed Mansour",
    initials: "AM",
    rating: 5,
    text: "Outstanding fragrance! Smells like a high-end niche perfume, projection is fantastic for hours.",
  },
  {
    name: "Ali Hassan",
    initials: "AH",
    rating: 4,
    text: "A dark, rich perfume with spices and incense. Perfect for winter nights. Highly addictive.",
  },
  {
    name: "Fatima Zahra",
    initials: "FZ",
    rating: 5,
    text: "Absolutely beautiful blend of rose and vanilla. It stays on clothes for days! Highly recommend.",
  },
  {
    name: "Tarek Hegazi",
    initials: "TH",
    rating: 5,
    text: "The wood and leather notes are perfectly balanced. Smells very sophisticated and bold.",
  }
];

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div className="review-card__header">
        <div className="review-card__avatar">
          {review.initials}
        </div>
        <div className="review-card__info">
          <span className="review-card__name">{review.name}</span>
          <span className="review-card__verified">Verified buyer</span>
        </div>
      </div>
      <div className="review-card__rating">
        <span className="review-card__stars">
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </span>
        <span className="review-card__score">{review.rating.toFixed(1)}</span>
      </div>
      <p className="review-card__text">{review.text}</p>
    </div>
  );
}

export default function ReviewsBanner() {
  const { data } = useQuery({
    queryKey: ["reviews-summary"],
    queryFn: () => getReviewsSummary(),
  });

  const { avg = 4.9, count = 140 } = data?.data ?? {};
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3000); 
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentIndex >= REVIEWS.length) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex((prev) => prev - REVIEWS.length);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!isTransitioning) {
      const timeout = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning]);

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <section className="reviews-section" aria-label="Customer Reviews">
      <div className="reviews-section__top">
        <div className="reviews-badge">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Google Reviews</span>
        </div>

        <div className="reviews-score-block">
          <span className="reviews-score">{avg.toFixed(1)}</span>
          <div className="reviews-stars-wrapper">
            <span className="reviews-stars">★★★★★</span>
            <span className="reviews-count">Based on {count}+ reviews</span>
          </div>
        </div>

        <h2 className="reviews-title">What Our Customers Say</h2>
        <p className="reviews-subtitle">
          Join thousands of satisfied customers who trust TIBR for authentic, luxury Egyptian fragrances. Our commitment to preserving heritage and delivering exceptional quality speaks through their experiences.
        </p>
      </div>

      <div className="reviews-carousel-wrapper">
        <div className="reviews-carousel">
          <div 
            className="reviews-track"
            style={{ 
              transform: `translateX(calc(-${currentIndex} * (340px + 24px)))`,
              transition: isTransitioning ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
            }}
          >
            {[...REVIEWS, ...REVIEWS].map((rev, idx) => (
              <ReviewCard key={idx} review={rev} />
            ))}
          </div>
          
          <button className="reviews-nav-next" onClick={handleNext} aria-label="Next review">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div className="reviews-pagination">
          {[0, 1, 2].map((dot) => (
            <button 
              key={dot}
              className={`reviews-dot ${Math.floor((currentIndex / REVIEWS.length) * 3) === dot ? 'is-active' : ''}`}
              onClick={() => handleDotClick(Math.floor((dot / 3) * REVIEWS.length))}
              aria-label={`Go to page ${dot + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
