<template>
  <Layout>
    <div class="flex flex-wrap items-start justify-start">
      <!-- <div
        class="order-2 w-full md:w-1/3 sm:pl-4 md:pl-6 lg:pl-8 sticky"
        style="top: 4rem"
      >
        // TODO: OnThisPage
      </div> -->

      <div class="order-1 w-full md:w-2/3">
        <div class="content">
          <h1 id="пара-слів-про-нас">
            <a href="#Стан-перекладу-документації" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >Стан перекладу документації загалом
          </h1>
          <p>
            <a href="/translation-status-priority"
              >Перейти на огляд пріоритетних сторінок</a
            >
          </p>
          <h2 id="як-зявився-цей-проєкт">
            <a href="#Огляд" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >Огляд
          </h2>
          <p>
            Нижче наведена порівняльна таблиця стану перекладу документації за
            розділами. Також тут зібрані корисні посилання, які можуть стати в
            пригоді під час перекладу чи редактури статей.
          </p>
          <table class="table table-bordered w-full doc-status__table">
            <thead>
              <tr>
                <th>Розділ</th>
                <th>Сторінки</th>
                <th>З них перекладено</th>
                <th>З них актуально</th>
                <th>Очікує на переклад</th>
              </tr>
            </thead>
            <tbody>
              <TranslationOverallStatusRow
                :all-pages="sections.css"
                :title="'CSS'"
                :anchor="'CSS'"
              />
              <TranslationOverallStatusRow
                :all-pages="sections.html"
                :title="'HTML'"
                :anchor="'HTML'"
              />
              <TranslationOverallStatusRow
                :all-pages="sections.javascript"
                :title="'JavaScript'"
                :anchor="'JavaScript'"
              />
              <TranslationOverallStatusRow
                :all-pages="sections.svg"
                :title="'SVG'"
                :anchor="'SVG'"
              />
              <TranslationOverallStatusRow
                :all-pages="sections.guide"
                :title="'Посібники'"
                :anchor="'Посібники'"
              />
              <TranslationOverallStatusRow
                :all-pages="allPages"
                :title="'Загалом'"
              />
            </tbody>
          </table>

          <h2 id="Стан-перекладу-за-розділами">
            <a href="#Стан-перекладу-за-розділами" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >Стан перекладу за розділами
          </h2>
          <h3 id="CSS">
            <a href="#CSS" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >CSS
          </h3>
          <TranslationStatusSection :pages="sections.css" />

          <h3 id="HTML">
            <a href="#HTML" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >HTML
          </h3>
          <TranslationStatusSection :pages="sections.html" />

          <h3 id="JavaScript">
            <a href="#JavaScript" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >JavaScript
          </h3>
          <TranslationStatusSection :pages="sections.javascript" />

          <h3 id="SVG">
            <a href="#SVG" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >SVG
          </h3>
          <TranslationStatusSection :pages="sections.svg" />

          <h3 id="Посібники">
            <a href="#Посібники" aria-hidden="true"
              ><span class="icon icon-link"></span></a
            >Посібники
          </h3>
          <TranslationStatusSection :pages="sections.guide" />
        </div>
      </div>
    </div>
  </Layout>
</template>

<page-query>
query {
  allMdnPage(sortBy: "title", order: ASC) {
    edges {
      node {
        id
        title
        slug
        path
        section
        originalPath
        hasContent
        updatesInOriginalRepo
        sourceLastUpdatetAt
        translationLastUpdatedAt
      }
    }
  }
}
</page-query>

<script>
import TranslationStatusSection from '@/components/TranslationStatusSection.vue';
import TranslationOverallStatusRow from '@/components/TranslationOverallStatusRow.vue';

export default {
  components: {
    TranslationStatusSection,
    TranslationOverallStatusRow,
  },

  metaInfo() {
    const title = 'Про веб, у вебі, для вебу';
    const description =
      'Проєкт Webdoky — це зібрання інформації про технології відкритого вебу. HTML, CSS, JavaScript, та API, як для вебсайтів, так і для прогресивних вебзастосунків';

    return {
      title: title,
      meta: [
        {
          name: 'description',
          content: description,
        },
        {
          key: 'og:title',
          name: 'og:title',
          content: title,
        },
        {
          key: 'twitter:title',
          name: 'twitter:title',
          content: title,
        },
        {
          key: 'og:description',
          name: 'og:description',
          content: description,
        },
        {
          key: 'twitter:description',
          name: 'twitter:description',
          content: description,
        },
        {
          key: 'robots',
          name: 'robots',
          content: 'noindex,nofollow',
        },
      ],
      link: [
        {
          rel: 'canonical',
          href: `${process.env.GRIDSOME_BASE_PATH}/`,
        },
      ],
    };
  },
  computed: {
    allPages() {
      return this.$page.allMdnPage.edges.map((node) => node.node);
    },
    sections() {
      const supportedSections = {
        css: [],
        html: [],
        javascript: [],
        svg: [],
        guide: [],
      };

      this.allPages.forEach((page) => {
        const { section } = page;
        if (section in supportedSections) {
          supportedSections[section].push(page);
        }
      });

      return supportedSections;
    },
  },
};
</script>

<style>
.doc-status__table .doc-status--not-translated {
  background-color: var(--color-intl-status-not-translated);
}
.doc-status__table .doc-status--translated {
  background-color: var(--color-intl-status-out-of-date);
}
.doc-status__table .doc-status--translated.doc-status--up-to-date {
  background-color: var(--color-intl-status-up-to-date);
}
</style>
