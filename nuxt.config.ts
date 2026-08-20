import tailwindcss from "@tailwindcss/vite";
import Decimal from "decimal.js"

// Configure Decimal.js to use normal notation instead of scientific notation
Decimal.config({ toExpPos: 9000000000000000 })
Decimal.config({ toExpNeg: -9000000000000000 })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  // Pages stay client-rendered; voucher API routes are still included by the Cloudflare Pages Nitro build.
  ssr: false,
  css: ["~/assets/css/tailwind.css"],
  app: {
    head: {
      title: 'Fund a Hackerspace - First Ever Pure DeFi Mortgage',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Fund the Bordel hackerspace mortgage, get exclusive perks and fixed APR for 5 years.' },
        { name: 'keywords', content: 'DeFi, mortgage, blockchain, Ethereum, Bordel Hackerspace, crowdfunding, actual DeFi, crypto loan' },
        // Open Graph
        { property: 'og:title', content: 'Fund a Hackerspace - First Ever Pure DeFi Mortgage' },
        { property: 'og:description', content: 'Fund the Bordel hackerspace mortgage, get exclusive perks and fixed APR for 5 years.' },
        { property: 'og:image', content: 'https://loan.bordel.wtf/images/parental-advisory-og.png' },
        { property: 'og:url', content: 'https://loan.bordel.wtf' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Fund a Hackerspace - First Ever Pure DeFi Mortgage' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Fund a Hackerspace - First Ever Pure DeFi Mortgage' },
        { name: 'twitter:description', content: 'Fund the Bordel hackerspace mortgage, get exclusive perks and fixed APR for 5 years.' },
        { name: 'twitter:image', content: 'https://loan.bordel.wtf/images/parental-advisory-og.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
  imports: {
    autoImport: true,
  },
  components: {
    // setting pathPrefix to false, as with it the auto imports on cloudflare pages did not
    //  correctly work for some unknown reason
    dirs: [
      { path: "~/components", pathPrefix: false },
      { path: "~/components/ui", pathPrefix: false },
      { path: "~/components/boxes", pathPrefix: false },
      { path: "~/components/modals", pathPrefix: false },
      { path: "~/components/icons", pathPrefix: false }
    ],
  },
  devServer: {
    port: 8000,
  },
  // TODO potentially add also:
  //  pinia persisted state?
  //  @vueuse/nuxt
  //  @nuxtjs/seo
  //  @vue-final-modal/nuxt
  //  @nuxtjs/web-vitals
  //  @nuxtjs/svg-sprite
  //  nuxt-svgo
  modules: ["@nuxt/eslint", "@nuxt/image", "@wagmi/vue/nuxt", "nuxt-typed-router", "shadcn-nuxt", "@pinia/nuxt"],
  vite: {
    resolve: {
      conditions: ["module", "import", "default"], // prioritize ESM
    },
    optimizeDeps: {
      include: ["eventemitter3"], // force prebundle
    },
    plugins: [tailwindcss()],
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./app/components/ui",
  },
  eslint: {
    checker: true,
  },
  runtimeConfig: {
    public: {
      moralisApiKey: process.env.NUXT_PUBLIC_MORALIS_API_KEY,
      clarityId: process.env.NUXT_PUBLIC_CLARITY_ID,
    }
  },
});
