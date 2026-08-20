<template>
  <section id="project-team" class="project-team" aria-labelledby="project-team-title">
    <header class="project-team__header">
      <h2 id="project-team-title">Meet the team behind Bordel.</h2>
    </header>

    <ul class="project-team__members">
      <li v-for="member in PROJECT_TEAM" :key="member.name">
        <a
          class="project-team__member-link"
          :href="`https://x.com/${member.xHandle}`"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`View ${member.name} on X (@${member.xHandle}, opens in a new tab)`"
        >
          <img
            :src="member.profileImage"
            alt=""
            width="56"
            height="56"
            loading="eager"
            decoding="async"
          >
          <span>
            <strong>{{ member.name }}</strong>
            <small>@{{ member.xHandle }} <span aria-hidden="true">↗</span></small>
          </span>
        </a>
        <p class="project-team__roles">
          <span v-for="role in member.roles" :key="role">{{ role }}</span>
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const PROJECT_TEAM = [
  {
    name: 'Mario Havel',
    profileImage: 'https://pbs.twimg.com/profile_images/1471102487365136384/3FeDe54c_400x400.jpg',
    roles: ['Bordel co-founder', 'Ethereum contributor'],
    xHandle: 'TMIYChao',
  },
  {
    name: 'Josef Jelacic',
    profileImage: 'https://pbs.twimg.com/profile_images/2084943300990062592/qaIN3MhU_400x400.jpg',
    roles: ['Bordel co-founder', 'OWN.casa'],
    xHandle: 'JosefJ_',
  },
  {
    name: 'Ceci',
    profileImage: 'https://pbs.twimg.com/profile_images/868854149428936704/NNMo0TNV_400x400.jpg',
    roles: ['Community organizer', 'ETHPrague'],
    xHandle: 'hyperalchemy',
  },
  {
    name: 'Josef Gattermayer',
    profileImage: 'https://pbs.twimg.com/profile_images/1589214087040360448/FIGprxeL_400x400.jpg',
    roles: ['Ackee co-founder', 'Security'],
    xHandle: 'jgattermayer',
  },
  {
    name: 'Albina',
    profileImage: 'https://pbs.twimg.com/profile_images/1997389601216880640/o6jlOaId_400x400.jpg',
    roles: ['Developer relations', 'Community'],
    xHandle: 'enjojoyy',
  },
] as const
</script>

<style scoped>
.project-team {
  width: 100%;
  min-width: 0;
  padding: 31px 39px;
  border-top: 1px solid var(--border);
  background: var(--paper);
  color: var(--ink);
}

.project-team__header {
  min-width: 0;
}

.project-team__header h2,
.project-team__members,
.project-team__members p {
  margin: 0;
}

.project-team__header h2 {
  font-family: var(--font-newsreader);
  font-size: 29px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 35px;
  letter-spacing: -.01em;
}

.project-team__members {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 31px;
  padding: 0;
  list-style: none;
}

.project-team__members li {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--paper);
  transition: background-color 150ms ease, border-color 150ms ease;
}

.project-team__member-link {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.project-team__member-link img {
  display: block;
  width: 56px;
  height: 56px;
  border: 1px solid var(--border);
  border-radius: 50%;
  object-fit: cover;
  transition: border-color 150ms ease;
}

.project-team__member-link > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.project-team__member-link strong {
  overflow-wrap: anywhere;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 20px;
}

.project-team__member-link small {
  color: var(--teal-dark);
  font: 700 9px/14px var(--font-mono);
  overflow-wrap: anywhere;
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
}

.project-team__members li:hover {
  border-color: var(--teal-dark);
  background: var(--paper-deep);
}

.project-team__member-link:hover img {
  border-color: var(--teal-dark);
}

.project-team__member-link:hover small {
  color: var(--teal);
}

.project-team__member-link:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--teal);
  outline-offset: 4px;
}

.project-team__members .project-team__roles {
  margin-top: 7px;
  padding-left: 68px;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 18px;
}

.project-team__roles > span {
  display: block;
}

@media (max-width: 1100px) {
  .project-team__members {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .project-team {
    padding: 31px 23px;
  }

  .project-team__header h2 {
    font-size: 27px;
    line-height: 33px;
  }

  .project-team__members {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .project-team__members li {
    padding: 14px;
  }
}

@media (max-width: 440px) {
  .project-team__members {
    grid-template-columns: minmax(0, 1fr);
  }

  .project-team__members .project-team__roles {
    padding-left: 68px;
  }
}
</style>
