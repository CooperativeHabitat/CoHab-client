<template>
  <nav class="navbar navbar-expand sticky-top border-bottom bg-body">
    <div class="container">
      <a href="/" class="navbar-brand d-flex align-items-center gap-2 text-primary">
        <HomeIcon :size="24" />
        <strong>Семейный органайзер</strong>
      </a>
      <ul v-if="state?.requiresAuth" class="navbar-nav ms-auto d-flex align-items-center">
        <li class="nav-item">
          <NotificationDropdown />
        </li>
        <li class="nav-item">
          <ProfileDropdown />
        </li>
      </ul>
    </div>
  </nav>
</template>

<script src="./Header.ts" lang="ts"></script>