import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';
import rehypePrism from '@mapbox/rehype-prism';
import remarkGfm from 'remark-gfm';
import rehypeUnwrapImages from 'rehype-unwrap-images';

// POSTS_PATH is useful when you want to get the path to a specific file
export const POSTS_PATH = path.join(process.cwd(), 'posts');

// getPostFilePaths is the list of all mdx files inside the POSTS_PATH directory
export const getPostFilePaths = () => {
  try {
    const files = fs.readdirSync(POSTS_PATH);
    // Only include md(x) files
    const mdxFiles = files.filter((path) => /\.mdx?$/.test(path));
    return mdxFiles;
  } catch (error) {
    console.warn('Error reading posts directory:', error.message);
    return [];
  }
};

export const sortPostsByDate = (posts) => {
  if (!Array.isArray(posts)) {
    console.warn('sortPostsByDate received non-array:', typeof posts);
    return [];
  }
  return posts.sort((a, b) => {
    const aDate = new Date(a.data.date);
    const bDate = new Date(b.data.date);
    return bDate - aDate;
  });
};

export const getPosts = () => {
  try {
    const postPaths = getPostFilePaths();
    
    // Ensure postPaths is always an array to prevent "object is not iterable" error
    if (!Array.isArray(postPaths)) {
      console.warn('getPostFilePaths returned non-array:', typeof postPaths);
      return [];
    }
    
    if (postPaths.length === 0) {
      console.warn('No posts found in posts directory');
      return [];
    }
    
    let posts = postPaths.map((filePath) => {
      try {
        const source = fs.readFileSync(path.join(POSTS_PATH, filePath));
        const { content, data } = matter(source);
        return {
          content,
          data,
          filePath,
        };
      } catch (error) {
        console.warn(`Error reading post file ${filePath}:`, error.message);
        return null;
      }
    }).filter(Boolean); // Remove any null entries from failed file reads
    
    posts = sortPostsByDate(posts);
    return posts;
  } catch (error) {
    console.error('Error in getPosts:', error.message);
    return []; // Always return an array, even on error
  }
};

export const getPostBySlug = async (slug) => {
  const postFilePath = path.join(POSTS_PATH, `${slug}.mdx`);
  const source = fs.readFileSync(postFilePath);
  const { content, data } = matter(source);
  const mdxSource = await serialize(content, {
    // Optionally pass remark/rehype plugins
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypePrism, rehypeUnwrapImages],
    },
    scope: data,
  });
  return { mdxSource, data, postFilePath };
};

export const getNextPostBySlug = (slug) => {
  const posts = getPosts();
  const currentFileName = `${slug}.mdx`;
  const currentPost = posts.find((post) => post.filePath === currentFileName);
  const currentPostIndex = posts.indexOf(currentPost);
  const post = posts[currentPostIndex - 1];
  // no prev post found
  if (!post) return null;
  const nextPostSlug = post?.filePath.replace(/\.mdx?$/, '');
  return {
    title: post.data.title,
    slug: nextPostSlug,
  };
};

export const getPreviousPostBySlug = (slug) => {
  const posts = getPosts();
  const currentFileName = `${slug}.mdx`;
  const currentPost = posts.find((post) => post.filePath === currentFileName);
  const currentPostIndex = posts.indexOf(currentPost);
  const post = posts[currentPostIndex + 1];
  // no prev post found
  if (!post) return null;
  const previousPostSlug = post?.filePath.replace(/\.mdx?$/, '');
  return {
    title: post.data.title,
    slug: previousPostSlug,
  };
};
