import { Link, useParams, Navigate } from "react-router-dom";
import { getBlogPost } from "@/lib/blogPosts";

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="store-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{post.title}</span>
      </nav>

      <article className="blog-post">
        <span className="blog-post__date">
          {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <h1 className="blog-post__title">{post.title}</h1>
        {post.body.split("\n\n").map((para, i) => (
          <p className="blog-post__para" key={i}>{para}</p>
        ))}
      </article>
    </div>
  );
}
