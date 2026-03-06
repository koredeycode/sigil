'use client';

import { CommandBox } from '@/components/CommandBox';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PostData {
  url: string;
  title: string;
  description?: string;
  date?: string;
  author?: string;
}

export function BlogListClient({ posts }: { posts: PostData[] }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.21, 0.47, 0.32, 0.98]
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-32">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center sm:text-left"
        >
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">Blog</h1>
          <p className="text-xl text-muted-foreground max-w-xl">
            Insights, engineering deep dives, and technical updates from the Sigil team.
          </p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {posts.map((post) => (
            <motion.div key={post.url} variants={item}>
              <Link
                href={post.url}
                className="group block h-full p-8 rounded-2xl border border-border bg-card/50 hover:bg-secondary/50 hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <time className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {new Date(post.date ?? '').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold tracking-tight mb-4 group-hover:text-primary transition-colors leading-tight">
                    {post.title}
                  </h2>
                  
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed mb-8">
                    {post.description}
                  </p>
                  
                  <div className="mt-auto flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary border border-border flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground/80">{post.author || 'Yusuf Akorede'}</span>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function BlogPostClient({ 
  children,
  title,
  description,
  date,
  author 
}: { 
  children: React.ReactNode,
  title: string,
  description?: string,
  date?: string,
  author?: string
}) {
  return (
    <div className="flex-1">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-3xl px-6 py-20 sm:py-32"
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to overview
          </Link>
        </motion.div>

        <header className="mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 text-sm text-muted-foreground mb-8"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary border border-border" />
              <span className="font-semibold text-foreground">{author || 'Yusuf Akorede'}</span>
            </div>
            <span className="text-border">/</span>
            <time className="font-mono uppercase tracking-wider text-xs">
              {new Date(date ?? '').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl sm:text-6xl font-bold tracking-tight mb-8 leading-[1.1]"
          >
            {title}
          </motion.h1>

          {description && (
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-6 py-1"
            >
              {description}
            </motion.p>
          )}
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="prose dark:prose-invert max-w-none 
            prose-headings:tracking-tight prose-headings:font-bold prose-headings:text-foreground
            prose-p:text-muted-foreground/90 prose-p:leading-[1.8] prose-p:text-lg
            prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-code:text-foreground prose-code:bg-card prose-code:border prose-code:border-border prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
            prose-img:rounded-2xl prose-img:border prose-img:border-border prose-img:shadow-xl
            prose-strong:text-foreground
            mb-24"
        >
          {children}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-24 pt-24 border-t border-border"
        >
          <div className="rounded-3xl border border-border bg-card p-12 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-3xl font-bold tracking-tight mb-4">Take command of your capital</h3>
              <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
                Sigil isn&apos;t just a wallet. It&apos;s a personal quantitative fund that runs on your machine.
              </p>
              <div className="flex flex-col items-center gap-6">
                <CommandBox command="npm i -g sigil-wallet" className="max-w-md w-full" />
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                >
                  Read implementation guide
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary),0.1),transparent)]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
