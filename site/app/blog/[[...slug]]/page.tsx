import { CommandBox } from '@/components/CommandBox';
import { blog } from '@/lib/source';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function BlogPage(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  
  // If no slug, show the list of posts
  if (!params.slug || params.slug.length === 0) {
    const posts = blog.getPages();
    return (
      <div className="flex flex-col items-center py-24 px-4 min-h-screen">
        <div className="max-w-4xl w-full">
          <Link 
            href="/" 
            className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:text-primary transition-colors mb-16 group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to home
          </Link>

          <div className="text-center mb-24">
            <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter inline-flex items-center gap-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
              Blog
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground/50 mt-8 font-medium max-w-lg mx-auto leading-relaxed">
              Updates, insights, and lobster wisdom from the Sigil team.
            </p>
          </div>

          <div className="flex flex-col gap-10 w-full">
            {posts.map((post) => (
              <Link 
                key={post.url} 
                href={post.url}
                className="group flex flex-col p-10 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.04] transition-all shadow-2xl relative"
              >
                <div className="text-xs font-medium text-muted-foreground/50 mb-6 flex items-center gap-2">
                  {new Date(post.data.date ?? '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  <span className="opacity-20">•</span>
                  <span>5 min read</span>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight mb-4 group-hover:text-primary transition-colors">
                  {post.data.title}
                </h2>
                
                <p className="text-muted-foreground/60 text-lg mb-8 line-clamp-2 leading-relaxed">
                  {post.data.description}
                </p>
                
                <div className="h-px w-full bg-white/5 mb-8" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      Y
                    </div>
                    <span className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest">
                      Yusuf Akorede
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary/70 uppercase tracking-widest">
                      #announcement
                    </span>
                    <span className="px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary/70 uppercase tracking-widest">
                      #solana
                    </span>
                  </div>
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
    <div className="flex flex-col items-center py-24 px-4 min-h-screen">
      <div className="max-w-3xl w-full">
        <Link 
          href="/blog" 
          className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:text-primary transition-colors mb-20 group"
        >
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to blog
        </Link>
        
        <header className="mb-20">
          <div className="flex items-center gap-4 mb-10 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-bold text-primary">
              Y
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-foreground">Yusuf Akorede</div>
              <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mt-0.5">
                {new Date(page.data.date ?? '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-8xl font-bold tracking-tighter mb-10 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 leading-none">
            {page.data.title}
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground/50 leading-relaxed font-medium">
            {page.data.description}
          </p>
        </header>
        
        <div className="prose prose-invert prose-green max-w-none 
          prose-headings:tracking-tighter prose-headings:font-bold
          prose-p:text-muted-foreground/80 prose-p:leading-[1.8] prose-p:text-lg
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-3xl prose-img:border prose-img:border-white/5 mb-24">
          <MDX />
        </div>

        {/* CTA Section */}
        <div className="mt-24 pt-24 border-t border-black/5 dark:border-white/5">
          <div className="flex flex-col items-center gap-12">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/30">Share this post</span>
              <div className="flex gap-2">
                <Link 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(page.data.title)}&url=${encodeURIComponent(`https://sigil.ai/blog/${params.slug?.join('/')}`)}`}
                  target="_blank"
                  className="px-6 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                  Share on X
                </Link>
              </div>
            </div>

            <div className="w-full p-12 rounded-[2.5rem] bg-black/[0.03] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 backdrop-blur-xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col items-center text-center">
                <h3 className="text-3xl font-bold tracking-tight mb-4">Ready to try Sigil?</h3>
                <p className="text-muted-foreground/50 mb-10 text-lg">Get started with a single command.</p>
                
                <CommandBox command="npm i -g sigil" className="max-w-sm w-full mb-12" />

                <Link
                  href="/docs"
                  className="px-10 py-4 rounded-2xl border border-black/10 dark:border-white/10 bg-foreground text-background font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Learn more →
                </Link>
              </div>
              
              {/* Decorative Blur */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 dark:bg-primary/5 blur-[120px] rounded-full opacity-50 dark:opacity-30 transition-opacity duration-1000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
