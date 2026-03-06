import { BlogListClient, BlogPostClient } from '@/components/BlogClient';
import { blog } from '@/lib/source';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  if (!params.slug || params.slug.length === 0) {
    return { title: 'Blog | Sigil' };
  }
  const page = blog.getPage(params.slug);
  if (!page) return { title: 'Blog | Sigil' };
  return { title: page.data.title };
}

export default async function BlogPage(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  
  // If no slug, show the list of posts
  if (!params.slug || params.slug.length === 0) {
    const posts = blog.getPages()
      .sort((a, b) => new Date(b.data.date ?? '').getTime() - new Date(a.data.date ?? '').getTime())
      .map(post => ({
        url: post.url,
        title: post.data.title,
        description: post.data.description,
        date: post.data.date ? new Date(post.data.date).toISOString() : undefined,
        author: post.data.author
      }));

    return <BlogListClient posts={posts} />;
  }

  // Otherwise, show the specific post
  const page = blog.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <BlogPostClient 
      title={page.data.title}
      description={page.data.description}
      date={page.data.date ? new Date(page.data.date).toISOString() : undefined}
      author={page.data.author}
    >
      <MDX />
    </BlogPostClient>
  );
}
