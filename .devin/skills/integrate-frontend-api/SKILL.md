---
name: integrate-frontend-api
description: Complete guide for replacing static mock data with real API calls in the YDM frontend (currently uses static data only)
---

# Frontend API Integration Skill

## Current State Assessment

**CRITICAL**: The frontend currently uses only static mock data. TanStack Query is configured but no API calls are implemented.

### **What's Missing**

- Frontend pages use static TypeScript data files
- No API integration despite TanStack Query being configured
- Contact forms are UI-only with no backend submission
- No loading states or error handling for API calls
- Generated React Query hooks exist but are unused

## Integration Workflow

### **Phase 1: Replace Static Data Imports**

#### **Current Static Data Structure**

```typescript
// src/data/industries.ts - CURRENTLY USED
export const industries = [
  {
    name: 'Photographers',
    slug: 'photographers',
    tagline: 'Capture moments, grow your business',
    // ... 11 more industries
  },
];

// src/data/posts.ts - CURRENTLY USED
export const posts = [
  {
    title: '5 Essential SEO Tips for Local Businesses',
    slug: '5-essential-seo-tips-local-businesses',
    // ... 5 more posts
  },
];
```

#### **Replace with API Hooks**

```typescript
// src/pages/Industry.tsx - REPLACE STATIC IMPORT
// OLD: import { industries } from '@/data/industries';

import { useParams } from 'wouter';
import { motion } from 'framer-motion';
import { useIndustriesQuery, useIndustryBySlugQuery } from '@workspace/api-client-react';

export function IndustryPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Get all industries for navigation
  const { data: industries, isLoading: industriesLoading } = useIndustriesQuery();

  // Get specific industry by slug
  const { data: industry, isLoading, error } = useIndustryBySlugQuery({ slug });

  if (isLoading || industriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading industry data...</div>
      </div>
    );
  }

  if (error || !industry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Industry not found</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="container mx-auto px-4 py-8"
    >
      <h1 className="text-4xl font-bold mb-4">{industry.name}</h1>
      <p className="text-xl text-gray-300 mb-8">{industry.tagline}</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Challenge</h2>
          <p className="text-gray-300">{industry.challenge}</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Strategy</h2>
          <p className="text-gray-300">{industry.strategy}</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Results</h2>
        <p className="text-green-400 text-lg">{industry.outcome}</p>
      </div>
    </motion.div>
  );
}
```

#### **Update Blog Pages**

```typescript
// src/pages/BlogList.tsx - REPLACE STATIC IMPORT
// OLD: import { posts } from '@/data/posts';

import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useBlogPostsQuery } from '@workspace/api-client-react';

export function BlogList() {
  const { data: posts, isLoading, error } = useBlogPostsQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading blog posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Error loading blog posts</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="container mx-auto px-4 py-8"
    >
      <h1 className="text-4xl font-bold mb-8">Blog</h1>

      <div className="grid gap-6">
        {posts?.map((post) => (
          <motion.article
            key={post.id}
            whileHover={{ y: -2 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <Link href={`/blog/${post.slug}`}>
              <h2 className="text-2xl font-semibold mb-2 hover:text-blue-400 transition-colors">
                {post.title}
              </h2>
            </Link>

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <span>{post.category}</span>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>

            <p className="text-gray-300 mb-4">{post.excerpt}</p>

            <Link
              href={`/blog/${post.slug}`}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Read more →
            </Link>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}

// src/pages/BlogPost.tsx - REPLACE STATIC IMPORT
import { useParams } from 'wouter';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useBlogPostBySlugQuery } from '@workspace/api-client-react';

export function BlogPost() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: post, isLoading, error } = useBlogPostBySlugQuery({ slug });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Post not found</div>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="container mx-auto px-4 py-8 max-w-4xl"
    >
      <Link href="/blog" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
        ← Back to Blog
      </Link>

      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

      <div className="flex items-center gap-4 text-sm text-gray-400 mb-8">
        <span>{post.category}</span>
        <span>•</span>
        <span>{post.readTime}</span>
        {post.publishedAt && (
          <>
            <span>•</span>
            <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={post.title}
          className="w-full h-64 object-cover rounded-xl mb-8"
        />
      )}

      <div className="prose prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </motion.article>
  );
}
```

### **Phase 2: Implement Contact Form Integration**

#### **Create Contact Form Component**

```typescript
// src/components/ContactForm.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreateLeadMutation } from '@workspace/api-client-react';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  message: string;
}

export const ContactForm: React.FC = () => {
  const createLeadMutation = useCreateLeadMutation();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createLeadMutation.mutateAsync(formData);
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        industry: '',
        message: '',
      });
    } catch (error) {
      console.error('Failed to submit contact form:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="backdrop-blur-md bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center"
      >
        <h3 className="text-2xl font-bold text-green-400 mb-2">Thank You!</h3>
        <p className="text-gray-300">Your message has been sent. We'll get back to you soon.</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
    >
      <h3 className="text-2xl font-bold mb-6">Get in Touch</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
          />
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium mb-2">
            Company
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
          />
        </div>
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium mb-2">
          Industry *
        </label>
        <select
          id="industry"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
        >
          <option value="">Select an industry</option>
          <option value="Photographers">Photographers</option>
          <option value="Plumbers">Plumbers</option>
          <option value="HVAC">HVAC</option>
          <option value="DJs">DJs</option>
          <option value="Hair Salons">Hair Salons</option>
          <option value="Daycares">Daycares</option>
          <option value="Bloggers">Bloggers</option>
          <option value="Restaurants">Restaurants</option>
          <option value="Fitness Studios">Fitness Studios</option>
          <option value="Real Estate">Real Estate</option>
          <option value="Veterinarians">Veterinarians</option>
          <option value="Accountants">Accountants</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={4}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={createLeadMutation.isPending}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors duration-150"
      >
        {createLeadMutation.isPending ? 'Sending...' : 'Send Message'}
      </button>

      {createLeadMutation.isError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          Failed to send message. Please try again.
        </div>
      )}
    </motion.form>
  );
};
```

#### **Update Contact Page**

```typescript
// src/pages/Contact.tsx - REPLACE STATIC FORM
import { motion } from 'framer-motion';
import { ContactForm } from '@/components/ContactForm';

export function Contact() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>
        <p className="text-xl text-gray-300 mb-8 text-center">
          Ready to transform your digital presence? Let's talk about your project.
        </p>

        <ContactForm />
      </div>
    </motion.div>
  );
}
```

### **Phase 3: Add Loading and Error States**

#### **Create Loading Components**

```typescript
// src/components/LoadingStates.tsx
import { motion } from 'framer-motion';

export const PageLoader: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="min-h-screen flex items-center justify-center"
  >
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </motion.div>
);

export const CardLoader: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6"
  >
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-white/20 rounded w-3/4"></div>
      <div className="h-4 bg-white/20 rounded w-1/2"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
    </div>
  </motion.div>
);

export const ListLoader: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <CardLoader key={i} />
    ))}
  </div>
);
```

#### **Create Error Components**

```typescript
// src/components/ErrorStates.tsx
import { motion } from 'framer-motion';

interface ErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const PageError: React.FC<ErrorProps> = ({
  message = 'Something went wrong',
  onRetry
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="min-h-screen flex items-center justify-center"
  >
    <div className="text-center space-y-4">
      <div className="text-red-400 text-6xl">⚠️</div>
      <h2 className="text-2xl font-bold text-red-400">{message}</h2>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150"
        >
          Try Again
        </button>
      )}
    </div>
  </motion.div>
);

export const CardError: React.FC<ErrorProps> = ({ message, onRetry }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="backdrop-blur-md bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center"
  >
    <div className="text-red-400 text-2xl mb-2">⚠️</div>
    <p className="text-red-200">{message || 'Failed to load data'}</p>
    {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150"
        >
          Retry
        </button>
      )}
  </motion.div>
);
```

### **Phase 4: Update Home Page with Dynamic Data**

#### **Enhanced Home Page**

```typescript
// src/pages/Home.tsx - REPLACE STATIC IMPORTS
// OLD: import { industries } from '@/data/industries';
// OLD: import posts from '@/data/posts';

import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useIndustriesQuery, useBlogPostsQuery } from '@workspace/api-client-react';
import { PageLoader, CardError, ListLoader } from '@/components/LoadingStates';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ParticleNetwork } from '@/components/ParticleNetwork';

export function Home() {
  const {
    data: industries,
    isLoading: industriesLoading,
    error: industriesError
  } = useIndustriesQuery();

  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError
  } = useBlogPostsQuery();

  if (industriesLoading || postsLoading) {
    return <PageLoader />;
  }

  if (industriesError || postsError) {
    return <PageError message="Failed to load home page data" />;
  }

  return (
    <div className="min-h-screen">
      <ParticleNetwork />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative min-h-screen flex items-center justify-center px-4"
      >
        <div className="text-center space-y-6 max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Transform Your Digital Presence
          </h1>
          <p className="text-xl text-gray-300">
            Custom web experiences for service-based businesses that drive results
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors duration-150"
              >
                Get Started
              </motion.button>
            </Link>
            <Link href="/industries">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors duration-150"
              >
                View Industries
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Featured Industries */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.1 }}
        className="py-20 px-4"
      >
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Industries We Serve</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries?.slice(0, 6).map((industry, index) => (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <Link href={`/industry/${industry.slug}`}>
                  <h3 className="text-xl font-semibold mb-2 hover:text-blue-400 transition-colors">
                    {industry.name}
                  </h3>
                  <p className="text-gray-300 mb-4">{industry.tagline}</p>
                  <div className="text-green-400 font-medium">{industry.outcome}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Latest Blog Posts */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.2 }}
        className="py-20 px-4"
      >
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Latest Insights</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts?.slice(0, 3).map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <Link href={`/blog/${post.slug}`}>
                  <h3 className="text-xl font-semibold mb-2 hover:text-blue-400 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span>{post.category}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <p className="text-gray-300">{post.excerpt}</p>
                </Link>
              </motion.article>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/blog">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors duration-150"
              >
                View All Posts
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
```

### **Phase 5: Configure TanStack Query**

#### **Query Client Configuration**

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Retry on network errors, not on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});
```

#### **Update App.tsx**

```typescript
// src/App.tsx - UPDATE QUERY CLIENT
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
// ... other imports

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... rest of app */}
    </QueryClientProvider>
  );
}
```

## Implementation Checklist

### **Static Data Replacement**

- [ ] Replace industries.ts imports with useIndustriesQuery
- [ ] Replace posts.ts imports with useBlogPostsQuery
- [ ] Update Industry page to use dynamic data
- [ ] Update BlogList and BlogPost pages
- [ ] Update Home page with dynamic content

### **Form Integration**

- [ ] Create ContactForm component with API submission
- [ ] Replace static contact form with functional one
- [ ] Add form validation and error handling
- [ ] Add success states and user feedback

### **Loading & Error States**

- [ ] Create PageLoader and CardLoader components
- [ ] Create PageError and CardError components
- [ ] Add loading states to all data-fetching components
- [ ] Add error handling with retry functionality

### **TanStack Query Configuration**

- [ ] Configure query client with proper retry logic
- [ ] Set appropriate stale time and cache time
- [ ] Add optimistic updates where appropriate
- [ ] Test cache invalidation strategies

### **Testing**

- [ ] Test all pages load data from API
- [ ] Test contact form submission
- [ ] Test loading states and error handling
- [ ] Verify cache behavior works correctly
- [ ] Test with network failures

## Common Issues & Solutions

### **API Hook Not Found**

- **Problem**: Generated hooks don't exist
- **Solution**: Run `pnpm --filter @workspace/api-spec run codegen`
- **Check**: Verify OpenAPI spec has correct operationId for each endpoint

### **CORS Issues**

- **Problem**: Frontend can't connect to API
- **Solution**: Ensure CORS middleware allows frontend origin
- **Check**: API server CORS configuration

### **Authentication Issues**

- **Problem**: API calls return 401 errors
- **Solution**: Ensure authentication middleware is properly configured
- **Check**: JWT tokens and cookie handling

### **Type Mismatches**

- **Problem**: Generated types don't match frontend expectations
- **Solution**: Update OpenAPI schemas to match frontend data structures
- **Check**: Run typecheck to validate integration

This frontend API integration transforms the static marketing website into a fully functional application with real data, form submissions, and proper error handling.
