import { Link } from "react-router-dom";
import { BLOG_POSTS } from "@/lib/blogPosts";

export default function Blog() {
  return (
    <div className="store-container">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Blog</h1>
        <p className="page-head__sub">Fragrance guides, tips, and the story behind TIBR.</p>
      </header>

      <div className="blog-grid">
        {BLOG_POSTS.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
            <span className="blog-card__date">
              {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <h2 className="blog-card__title">{post.title}</h2>
            <p className="blog-card__excerpt">{post.excerpt}</p>
            <span className="blog-card__cta">Read more</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
