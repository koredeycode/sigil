import { CommandBox } from '@/components/CommandBox';
import { blog } from '@/lib/source';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  if (!params.slug || params.slug.length === 0) {
    return { title: 'Blog | Sigil' };
  }
  const page = blog.getPage(params.slug);
  if (!page) return { title: 'Blog | Sigil' };
  return { title: `${page.data.title} | Sigil Blog` };
}

export default async function BlogPage(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  
  // If no slug, show the list of posts
  if (!params.slug || params.slug.length === 0) {
    const posts = blog.getPages();
    return (
      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Blog</h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Updates, deep dives, and announcements from the Sigil team.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <Link
                key={post.url}
                href={post.url}
                className="group flex items-start justify-between gap-6 p-6 -mx-6 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight mb-2 group-hover:text-primary transition-colors">
                    {post.data.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.data.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                  <time className="text-xs text-muted-foreground tabular-nums">
                    {new Date(post.data.date ?? '').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the specific post
  const page = blog.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          All posts
        </Link>

        <header className="mb-12 pb-12 border-b border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
            <span className="font-medium text-foreground">{page.data.author || 'Yusuf Akorede'}</span>
            <span className="text-border">·</span>
            <time>
              {new Date(page.data.date ?? '').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
            {page.data.title}
          </h1>
          {page.data.description && (
            <p className="text-xl text-muted-foreground leading-relaxed">
              {page.data.description}
            </p>
          )}
        </header>

        <div className="prose dark:prose-invert max-w-none 
          prose-headings:tracking-tight prose-headings:font-bold
          prose-p:text-muted-foreground prose-p:leading-[1.8]
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-code:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
          prose-img:rounded-xl prose-img:border prose-img:border-border
          mb-16">
          <MDX />
        </div>

        {/* CTA */}
        <div className="mt-16 pt-16 border-t border-border">
          <div className="rounded-xl border border-border bg-card p-10 text-center relative overflow-hidden">
            <h3 className="text-2xl font-bold tracking-tight mb-3">Try Sigil</h3>
            <p className="text-muted-foreground mb-8">Get started with a single command.</p>
            <div className="flex flex-col items-center gap-4">
              <CommandBox command="npm i -g sigil" className="max-w-sm w-full" />
              <Link
                href="/docs"
                className="text-sm font-medium text-primary hover:underline"
              >
                Read the documentation →
              </Link>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[120px] -z-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
