import { Link } from "react-router-dom";
import { BLOG_POSTS } from "@/lib/blogPosts";

export default function BlogRail() {
  const latest = [...BLOG_POSTS].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

  return (
    <section className="shop-home-section" aria-label="From the blog">
      <div className="product-rail__head">
        <h2 className="shop-home-section__title">From the Blog</h2>
        <Link className="product-rail__view-all" to="/blog">View All</Link>
      </div>
      <div className="blog-rail__track">
        {latest.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card blog-card--rail">
            <span className="blog-card__date">
              {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <h3 className="blog-card__title">{post.title}</h3>
            <p className="blog-card__excerpt">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
