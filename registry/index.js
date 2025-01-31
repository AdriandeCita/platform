const parseFrontMatter = require('gray-matter');
const fs = require('fs');

const walk = require('./utils/walk');
const findHeadings = require('./utils/find-headings');
const { getNewCommits } = require('./utils/git-commit-data');
const { runMacros } = require('./macros-runner');
const {
  mdParseAndProcess,
  htmlParseAndProcess,
  mdToRehype,
  htmlProcess,
} = require('./contentProcessors');
const {
  sourceLocale,
  pathToOriginalContent,
  targetLocale,
  pathToLocalizedContent,
} = require('./config');

const generateSlugToPathMap = (paths, locale) => {
  const map = new Map();

  paths.forEach((path) => {
    const localPath = path.split(locale.toLowerCase())[1];
    if (!localPath) {
      throw new Error(`Failed to get subpath for ${path}`);
    }

    map.set(localPath, path);
  });

  return map;
};

const registry = {
  localizedContentMap: undefined,
  contentPages: new Map(),

  // counters for visual notifications
  pagePostProcessedAmount: 0,
  estimatedContentPagesAmount: 0,

  getPagesData() {
    return this.contentPages.values();
  },

  async init() {
    const cssSourcePages = await walk(
      `${pathToOriginalContent}/${sourceLocale.toLowerCase()}/web/css`
    );

    const htmlSourcePages = await walk(
      `${pathToOriginalContent}/${sourceLocale.toLowerCase()}/web/html`
    );

    const javaScriptSourcePages = await walk(
      `${pathToOriginalContent}/${sourceLocale.toLowerCase()}/web/javascript`
    );

    const svgSourcePages = await walk(
      `${pathToOriginalContent}/${sourceLocale.toLowerCase()}/web/svg`
    );

    const guideSourcePages = await walk(
      `${pathToOriginalContent}/${sourceLocale.toLowerCase()}/web/guide`
    );

    const otherSourcePages = await walk(
      `${pathToOriginalContent}/${sourceLocale.toLowerCase()}/web/`,
      false
    );

    const localizedContentPages = await walk(
      `${pathToLocalizedContent}/${targetLocale.toLowerCase()}`
    );

    this.localizedContentMap = generateSlugToPathMap(
      localizedContentPages,
      targetLocale
    );

    console.log('rendering pages...');
    const cssProcessingTasks = await this.processSection(cssSourcePages, 'css');
    const htmlProcessingTasks = await this.processSection(
      htmlSourcePages,
      'html'
    );
    const javascriptProcessingTasks = await this.processSection(
      javaScriptSourcePages,
      'javascript'
    );
    const svgProcessingTasks = await this.processSection(svgSourcePages, 'svg');
    const guideProcessingTasks = await this.processSection(
      guideSourcePages,
      'guide'
    );
    const otherPagesProcessingTasks = await this.processSection(
      otherSourcePages,
      ''
    );
    console.table({
      'CSS Pages': cssProcessingTasks.length,
      'HTML Pages': htmlProcessingTasks.length,
      'JavaScript Pages': javascriptProcessingTasks.length,
      'SVG Pages': svgProcessingTasks.length,
      Guides: guideProcessingTasks.length,
      'Other Pages': otherPagesProcessingTasks.length,
    });
    const aggregatedTasks = [
      ...cssProcessingTasks,
      ...htmlProcessingTasks,
      ...javascriptProcessingTasks,
      ...svgProcessingTasks,
      ...guideProcessingTasks,
      ...otherPagesProcessingTasks,
    ];
    this.estimatedContentPagesAmount = aggregatedTasks.length;
    await Promise.all(aggregatedTasks);

    //
    console.log('Initial registry is ready, expanding macros:');

    for ([slug, pageData] of this.contentPages) {
      const {
        hasLocalizedContent,
        content: rawContent,
        data,
        path,
        ...otherPageData
      } = pageData;
      const { content, data: processedData } = runMacros(rawContent, {
        path,
        slug,
        registry: this,
        targetLocale,
      });

      this.contentPages.set(data.slug, {
        content: hasLocalizedContent ? content : '',
        hasLocalizedContent,
        data: {
          ...data,
          ...processedData,
        },
        path,
        ...otherPageData,
      });

      process.stdout.write(
        `${++this.pagePostProcessedAmount} of ${
          this.estimatedContentPagesAmount
        } pages\r`
      );
    }
    console.log(`Done with macros, ${this.pagePostProcessedAmount} processed`);
  },

  async processSection(originalPaths, sectionName) {
    const mapOfOriginalContent = generateSlugToPathMap(
      originalPaths,
      sourceLocale
    );
    const tasks = [];

    for ([slug, path] of mapOfOriginalContent) {
      if (/\(/.test(path)) {
        // TODO: fix vue router giving me an error on such paths
        continue;
      }
      if (path.slice(-2) === 'md' || path.slice(-4) === 'html') {
        // TODO: we'll need images here
        tasks.push(this.processPage(slug, mapOfOriginalContent, sectionName));
      }
    }

    return tasks;
  },

  async processPage(key, mapOfOriginalContent, sectionName) {
    const mapOfLocalizedContent = this.localizedContentMap;
    let mdKey;
    let htmlKey;

    if (key.slice(-3) === '.md') {
      mdKey = key;
      htmlKey = `${key.slice(0, -3)}.html`;
    } else if (key.slice(-5) === '.html') {
      mdKey = `${key.slice(0, -5)}.md`;
      htmlKey = key;
    }

    // default to localized content path
    const originalFullPath =
      mapOfOriginalContent.get(htmlKey) || mapOfOriginalContent.get(mdKey);
    let path =
      mapOfLocalizedContent.get(htmlKey) || mapOfLocalizedContent.get(mdKey);
    let hasLocalizedContent = !!path || false;

    if (!path) {
      // make sure there is at least original content path, if localized one is missing
      path = originalFullPath;
    }

    const { content, headings, data } = await this.processContentPage(path);

    const commitInformation = hasLocalizedContent
      ? await getNewCommits(path)
      : [];

    this.contentPages.set(data.slug, {
      content,
      hasLocalizedContent,
      headings,
      data,
      path: `/${targetLocale}/docs/${data.slug}`,
      updatesInOriginalRepo: commitInformation,
      section: sectionName,
      originalPath: originalFullPath.split(sourceLocale.toLowerCase())[1],
    });
    process.stdout.write(
      `Processed ${this.contentPages.size} of ${this.estimatedContentPagesAmount} pages\r`
    );
  },

  async processContentPage(path) {
    if (path.slice(-3) === '.md') {
      return await this.processMdPage(path);
    } else {
      return await this.processHtmlPage(path);
    }
  },

  async processMdPage(path) {
    const input = await fs.promises.readFile(path);

    const { data, content: mdContent } = parseFrontMatter(input);

    const parsedInput = mdParseAndProcess.parse(mdContent);

    const linkedContentAst = await mdParseAndProcess.run(parsedInput);
    const rehypeAst = await mdToRehype.run(linkedContentAst);
    const processedRehypeAst = await htmlProcess.run(rehypeAst);

    const content = htmlProcess.stringify(processedRehypeAst);
    const headings = findHeadings(rehypeAst);

    return {
      content,
      headings,
      data,
    };
  },

  async processHtmlPage(path) {
    const input = await fs.promises.readFile(path);

    const { content: htmlContent, data } = parseFrontMatter(input);

    const parsedInputAst = htmlParseAndProcess.parse(htmlContent);
    const linkedContentAst = await htmlParseAndProcess.run(parsedInputAst);
    const processedHtmlAst = await htmlProcess.run(linkedContentAst);

    const content = htmlProcess.stringify(processedHtmlAst);
    const headings = findHeadings(linkedContentAst);

    return {
      content,
      headings,
      data,
    };
  },
};

module.exports = {
  registry,
};
