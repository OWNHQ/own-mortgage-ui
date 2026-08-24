<template>
  <article
    id="project-details"
    class="project-description"
    aria-labelledby="project-description-title"
  >
    <header class="project-description__header">
      <h2 id="project-description-title">
        A permanent home for a hackerspace.
      </h2>

      <nav
        class="project-description__links"
        aria-label="Related project links"
      >
        <span>RELATED LINKS</span>
        <a href="https://bordel.wtf" target="_blank" rel="noopener noreferrer"
          >VISIT BORDEL ↗</a
        >
        <a
          href="https://paragraph.com/@bordel/decentralized-crowdloaning"
          target="_blank"
          rel="noopener noreferrer"
          >READ THE MORTGAGE ARTICLE ↗</a
        >
        <a
          href="https://signal.group/#CjQKILd9jG3SmC5jEkCf0VbavrETuLixY7wxITmlkg8dWbdrEhD6qay9BKGWmjYLRFKFZjeB"
          target="_blank"
          rel="noopener noreferrer"
          >JOIN SIGNAL ↗</a
        >
        <a :href="contractUrl" target="_blank" rel="noopener noreferrer"
          >LOAN CONTRACT ↗</a
        >
        <ShareModal />
      </nav>
    </header>

    <Dialog v-model:open="isImageDialogOpen">
      <DialogTrigger as-child>
        <button
          class="project-description__image"
          type="button"
          aria-label="Expand Bordel hackerspace image"
        >
          <img
            src="/images/bordel-hackerspace.jpeg"
            alt="Red neon Bordel sign inside the hackerspace"
            width="3072"
            height="2304"
          />
        </button>
      </DialogTrigger>
      <DialogContent
        class="!h-[calc(100vh-2rem)] !w-[calc(100vw-2rem)] !max-w-none !rounded-[16px] !p-4"
      >
        <DialogTitle class="sr-only">Bordel hackerspace interior</DialogTitle>
        <DialogDescription class="sr-only">
          Enlarged view of the red neon Bordel sign inside the hackerspace.
        </DialogDescription>
        <img
          src="/images/bordel-hackerspace.jpeg"
          alt="Red neon Bordel sign inside the hackerspace"
          class="h-full w-full object-contain"
        />
      </DialogContent>
    </Dialog>
    <p class="project-description__caption">
      Community workshop and event space.
    </p>

    <div class="project-description__copy">
      <section>
        <h3>A mortgage alternative, built with DeFi</h3>
        <p>
          This project is presented by its creators as a first-of-its-kind
          experiment in using DeFi to finance real-estate ownership. A
          five-year, fixed-rate installment loan on Ethereum financed the
          purchase of a permanent property through transparent, community-funded
          credit.
        </p>
        <p>
          Instead of relying on a standard bank mortgage, lenders supplied USDC
          against weETH collateral and are repaid in scheduled installments over
          the term. It is designed as a practical, onchain alternative to a
          conventional mortgage rather than a token sale or a donation campaign.
        </p>
      </section>

      <section id="ownership-and-lender-claim">
        <h3>Ownership and lender claim</h3>
        <p>
          A Czech joint-stock company owns the permanent property and is the
          borrower. weETH providers receive company shares; USDC lenders fund
          the senior loan, not property equity.
        </p>
      </section>

      <section>
        <h3>A hackerspace for Prague</h3>
        <p>
          The property is a permanent home for Bordel, a Prague hackerspace
          where hackers, tinkerers, developers, makers, artists and curious
          newcomers share a workshop and coworking space. Its culture connects
          technology and art, with a particular focus on digital sovereignty,
          cybersecurity, privacy and open-source tools.
        </p>
        <p>
          The space combines desks with 3D printers, soldering stations,
          electronics, an audio setup and room for workshops and meetups. Its
          community has hosted privacy-respecting software and blockchain
          infrastructure, supported Ethereum testing, built Bitcoin Lightning
          hardware, and run sessions on GrapheneOS, GNU/Linux, creative
          prototyping, programmable art, biology and hardware hacking.
        </p>
        <p>
          It operates as a do-ocracy: members help shape and run the space
          through the work and ideas they contribute.
        </p>
      </section>

      <section>
        <h3>A self-sustaining revenue model</h3>
        <p>
          About 25 active members pay monthly membership fees. Pricing is
          designed to cover the space's operating costs and scheduled loan
          payments, making it financially self-sustaining. Events, the community
          bar and donations provide additional support without replacing that
          recurring income.
        </p>
      </section>

      <section>
        <h3>After the loan</h3>
        <p>
          Once the five-year loan is fully repaid, income previously used for
          debt service can expand the space, purchase more tools and equipment,
          and fund new community-led projects.
        </p>
      </section>

      <section>
        <h3>Why Bordel?</h3>
        <p>
          In Czech, <em>bordel</em> means "a mess" - chaos, if you will. The
          name embraces the idea that apparent disorder can contain a higher
          kind of order: the creative tension from which new ideas, projects
          and communities emerge.
        </p>
        <p>
          The name may be provocative, but that is partly the point. It acts as
          a filter for people drawn to substance over presentation - people
          more interested in what the community builds and values than in the
          form it takes. As members sometimes say, Bordel is not just a
          community. Bordel is a state of mind.
        </p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { PWN_LOAN_ADDRESS } from "~/constants/addresses";

const isImageDialogOpen = ref(false);
const contractUrl = `https://etherscan.io/address/${PWN_LOAN_ADDRESS}`;
</script>

<style scoped>
.project-description {
  min-width: 0;
  min-height: 100%;
  padding: 38px 39px 32px;
  background: var(--paper);
  color: var(--ink);
}

.project-description__header h2,
.project-description__copy p,
.project-description__copy h3,
.project-description__copy ul,
.project-description__caption {
  margin: 0;
}

.project-description__header h2 {
  font-family: var(--font-newsreader);
  font-size: 30px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 36px;
  letter-spacing: -0.01em;
}

.project-description__links {
  display: flex;
  min-height: 44px;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
  margin-top: 11px;
  font: 700 9px/14px var(--font-mono);
}

.project-description__links > span {
  color: var(--muted-ink);
}

.project-description__links a {
  color: var(--teal-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.project-description__links a:focus-visible,
.project-description__image:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--teal);
  outline-offset: 3px;
}

.project-description__image {
  display: block;
  width: 100%;
  height: 234px;
  margin-top: 2px;
  overflow: hidden;
  border: 0;
  border-radius: 10px;
  background: var(--paper-deep);
  cursor: zoom-in;
}

.project-description__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 44%;
  transition: transform 220ms ease;
}

.project-description__image:hover img {
  transform: scale(1.015);
}

.project-description__caption {
  margin-top: 8px;
  color: var(--muted-ink);
  font-size: 10px;
  line-height: 14px;
}

.project-description__copy {
  display: grid;
  gap: 14px;
  margin-top: 34px;
}

.project-description__copy p,
.project-description__copy li {
  color: var(--ink);
  font-size: 14px;
  line-height: 21px;
  text-align: justify;
}

.project-description__copy h3 {
  font-family: var(--font-newsreader);
  font-size: 21px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 26px;
}

.project-description__copy section {
  display: grid;
  gap: 8px;
}

.project-description__copy ul {
  padding: 0;
  list-style: none;
}

.project-description__copy li::before {
  content: "· ";
}

@media (max-width: 720px) {
  .project-description {
    padding: 28px 23px;
  }

  .project-description__header h2 {
    font-size: 28px;
    line-height: 34px;
  }

  .project-description__image {
    height: clamp(190px, 52vw, 280px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .project-description__image img {
    transition: none;
  }
}
</style>
