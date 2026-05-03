# UI 디자인 가이드 — v3 (Trendy + Responsive)

## 1. 디자인 컨셉

- **테마**: Deep Space Purple — 검정 우주 + 보라 에너지
- **레퍼런스**: Linear 2025, Vercel AI Chat, Perplexity, Loom
- **핵심 기법**: Glassmorphism + Gradient Border + Noise Texture + Aurora Mesh + Spring Physics
- **원칙**: Motion is meaning. 모든 애니메이션에 물리적 이유가 있어야 한다.

---

## 2. CSS 커스텀 변수 (globals.css :root)

```css
:root {
  /* 배경 레이어 */
  --bg-base:        #07070F;
  --bg-surface:     #0D0D1A;
  --bg-elevated:    #13132A;
  --bg-hover:       #16163A;
  --bg-sidebar:     #09091A;

  /* 보더 */
  --border:         #1C1C3A;
  --border-focus:   #7C3AED;
  --border-glow:    rgba(124, 58, 237, 0.4);

  /* 퍼플 팔레트 */
  --purple-900:     #3B0764;
  --purple-800:     #5B21B6;
  --purple-700:     #6D28D9;
  --purple-600:     #7C3AED;
  --purple-500:     #8B5CF6;
  --purple-400:     #A78BFA;
  --purple-300:     #C084FC;
  --purple-200:     #DDD6FE;

  /* 그라디언트 */
  --grad-primary:   linear-gradient(135deg, #7C3AED 0%, #C084FC 100%);
  --grad-subtle:    linear-gradient(135deg, #3B0764 0%, #1C1C3A 100%);
  --grad-text:      linear-gradient(90deg, #C084FC 0%, #A78BFA 50%, #7C3AED 100%);

  /* 글로우 */
  --glow-sm:        0 0 12px rgba(124, 58, 237, 0.15);
  --glow-md:        0 0 24px rgba(124, 58, 237, 0.25);
  --glow-lg:        0 0 48px rgba(124, 58, 237, 0.3);
  --glow-input:     0 0 20px rgba(124, 58, 237, 0.2), 0 0 40px rgba(124, 58, 237, 0.1);

  /* 텍스트 */
  --text-primary:   #EDE9FE;
  --text-secondary: #A78BFA;
  --text-muted:     #6B7280;
  --text-dim:       #374151;

  /* 상태 */
  --success:        #10B981;
  --error:          #EF4444;
  --warning:        #F59E0B;
}
```

---

## 3. 핵심 비주얼 기법 구현 코드

### 3.1 Gradient Border (그라디언트 보더)

```tsx
// components/ui/GradientBorder.tsx
// 퍼플 그라디언트 보더 — 카드·패널에 사용
export function GradientBorder({ children, className }: Props) {
  return (
    <div className={cn("relative rounded-xl p-[1px]", className)}>
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.6) 0%, rgba(192,132,252,0.3) 50%, transparent 100%)',
        }}
      />
      <div className="relative rounded-[11px] bg-[#0D0D1A]">
        {children}
      </div>
    </div>
  )
}

// Tailwind로 구현 시 (간단한 케이스)
// className="relative before:absolute before:inset-[-1px] before:rounded-[13px]
//            before:bg-gradient-to-br before:from-purple-600/60 before:to-purple-300/20
//            before:-z-10 rounded-xl bg-[#0D0D1A]"
```

### 3.2 Noise Texture Overlay (노이즈 텍스처)

```tsx
// app/layout.tsx에 추가 — 전체 페이지에 미묘한 grain 효과
// 깊이감과 고급스러움 부여
<div
  className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '128px 128px',
  }}
/>
```

### 3.3 Aurora Mesh Background (오로라 배경)

```tsx
// components/ui/AuroraBackground.tsx
// 움직이는 퍼플 오로라 — 온보딩 및 배경 깊이감
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* 메인 오로라 */}
      <motion.div
        className="absolute top-[-20%] left-[30%] h-[600px] w-[600px] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(ellipse, #7C3AED 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ x: [0, 60, -40, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* 보조 오로라 */}
      <motion.div
        className="absolute bottom-[-10%] right-[20%] h-[400px] w-[400px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(ellipse, #C084FC 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, -40, 30, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
    </div>
  )
}
```

### 3.4 Shimmer Loading Skeleton

```tsx
// components/ui/Shimmer.tsx
// 로딩 스켈레톤 — 메시지 로딩 시 사용
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="h-8 w-8 animate-pulse rounded-full bg-[#1C1C3A]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-shimmer rounded-lg bg-gradient-to-r
                        from-[#1C1C3A] via-[#2A2A4A] to-[#1C1C3A]
                        bg-[length:400%_100%]" />
        <div className="h-4 w-1/2 animate-shimmer rounded-lg bg-gradient-to-r
                        from-[#1C1C3A] via-[#2A2A4A] to-[#1C1C3A]
                        bg-[length:400%_100%]" />
      </div>
    </div>
  )
}

// tailwind.config.ts에 shimmer 애니메이션 추가
// animation: { shimmer: 'shimmer 2s infinite' }
// keyframes: { shimmer: { '0%': {backgroundPosition: '200% 0'},
//                         '100%': {backgroundPosition: '-200% 0'} } }
```

### 3.5 Framer Motion Spring 설정값

```typescript
// lib/animations.ts — 전체 프로젝트 공통 애니메이션 설정

// 빠르고 탄력 있는 팝업 (버튼, 카드 등장)
export const springPop = {
  type: 'spring', stiffness: 500, damping: 30, mass: 0.8,
}

// 부드러운 슬라이드 (사이드바, 드롭다운)
export const springSlide = {
  type: 'spring', stiffness: 300, damping: 35, mass: 1,
}

// 무거운 진입 (페이지, 모달)
export const springHeavy = {
  type: 'spring', stiffness: 200, damping: 28, mass: 1.2,
}

// 표준 이징
export const easeOut = { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
export const easeInOut = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }

// 메시지 등장 variants
export const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...springPop } },
}

// 소스 카드 stagger variants
export const sourceContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
export const sourceCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...springPop } },
}

// 리스트 항목 stagger
export const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}
export const listItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { ...easeOut } },
}
```

---

## 4. 컴포넌트 상세 명세

### 4.1 Header

```tsx
// Tailwind classes (정확한 구현 가이드)
<header className="
  fixed top-0 inset-x-0 z-50 h-16
  flex items-center justify-between px-4 lg:px-6
  bg-[#07070F]/80 backdrop-blur-xl
  border-b border-[#1C1C3A]
  after:absolute after:bottom-0 after:inset-x-0 after:h-[1px]
  after:bg-gradient-to-r after:from-transparent after:via-purple-600/30 after:to-transparent
">

// 로고 — 그라디언트 텍스트 + 아이콘
<div className="flex items-center gap-2">
  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-300
                  flex items-center justify-center shadow-[var(--glow-sm)]">
    <Sparkles className="h-4 w-4 text-white" />
  </div>
  <span className="font-bold text-[#EDE9FE] tracking-tight">SV Dev RAG</span>
</div>

// 중앙 — 수집 현황
<div className="hidden sm:flex items-center gap-2 text-sm text-[#6B7280]">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
  </span>
  <span>영상 <span className="text-[#A78BFA] font-medium">{count}</span>개</span>
</div>
```

### 4.2 ConversationSidebar

```tsx
// 데스크탑: 고정 사이드바
// 모바일: bottom sheet (AnimatePresence로 마운트/언마운트)

// 사이드바 컨테이너
<motion.aside
  initial={{ x: -280 }}
  animate={{ x: 0 }}
  transition={springSlide}
  className="
    fixed left-0 top-16 bottom-0 w-64 z-40
    bg-[#09091A] border-r border-[#1C1C3A]
    flex flex-col overflow-hidden
    hidden lg:flex
  "
>

// 새 대화 버튼
<button className="
  mx-3 mt-3 flex items-center gap-2 rounded-lg
  border border-[#1C1C3A] px-3 py-2
  text-sm text-[#6B7280]
  hover:border-purple-600/50 hover:bg-[#16163A] hover:text-[#EDE9FE]
  transition-all duration-150
  group
">
  <Plus className="h-4 w-4 group-hover:text-purple-400 transition-colors" />
  새 대화
</button>

// 대화 항목 (활성/비활성)
// active: bg-[#13132A] border-l-2 border-purple-600 text-[#EDE9FE]
// default: text-[#6B7280] hover:bg-[#0D0D1A] hover:text-[#EDE9FE]

// 모바일 Bottom Sheet
<AnimatePresence>
  {mobileOpen && (
    <>
      <motion.div  // 오버레이
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        onClick={() => setMobileOpen(false)}
      />
      <motion.div  // 시트
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springSlide}
        className="fixed bottom-0 inset-x-0 z-50 h-[70vh] rounded-t-2xl
                   bg-[#0D0D1A] border-t border-[#1C1C3A] lg:hidden"
      >
        {/* drag handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#1C1C3A]" />
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### 4.3 ChatMessage (v3 — 강화된 디자인)

```tsx
// 사용자 메시지
<motion.div
  variants={messageVariants}
  initial="hidden"
  animate="visible"
  className="flex justify-end px-4 py-1"
>
  <div className="
    max-w-[80%] lg:max-w-[65%]
    rounded-2xl rounded-br-sm px-4 py-3
    bg-gradient-to-br from-purple-600/30 to-purple-800/20
    border border-purple-600/30
    shadow-[0_0_20px_rgba(124,58,237,0.12)]
    text-[#EDE9FE] text-sm leading-relaxed
  ">
    {content}
  </div>
</motion.div>

// AI 메시지
<motion.div
  variants={messageVariants}
  initial="hidden"
  animate="visible"
  className="flex items-start gap-3 px-4 py-1"
>
  {/* AI 아바타 */}
  <div className="
    flex-shrink-0 h-8 w-8 rounded-lg
    bg-gradient-to-br from-purple-700 to-purple-400
    flex items-center justify-center
    shadow-[var(--glow-sm)]
  ">
    <Sparkles className="h-4 w-4 text-white" />
  </div>

  <div className="
    max-w-[80%] lg:max-w-[70%] flex-1
    rounded-2xl rounded-tl-sm px-4 py-3
    bg-[#0D0D1A] border border-[#1C1C3A]
    text-[#EDE9FE] text-sm leading-relaxed
    relative overflow-hidden
    before:absolute before:top-0 before:inset-x-0 before:h-[1px]
    before:bg-gradient-to-r before:from-transparent before:via-purple-600/40 before:to-transparent
  ">
    {/* Markdown 렌더링 내용 */}
    <div className="prose prose-invert prose-sm max-w-none
                    prose-p:text-[#EDE9FE] prose-p:leading-relaxed
                    prose-code:text-purple-300 prose-code:bg-[#13132A] prose-code:rounded
                    prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline">
      {content}
    </div>
  </div>
</motion.div>
```

### 4.4 SourceCard (v3 — 그라디언트 보더 + 호버 글로우)

```tsx
<motion.div
  variants={sourceContainerVariants}
  initial="hidden"
  animate="visible"
  className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2"
>
  {sources.map((source) => (
    <motion.a
      key={source.timestamp_url}
      variants={sourceCardVariants}
      href={source.timestamp_url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group relative block rounded-xl p-[1px]
        bg-gradient-to-br from-purple-600/30 via-transparent to-transparent
        hover:from-purple-600/60 hover:to-purple-400/20
        transition-all duration-200
      "
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
    >
      <div className="
        relative rounded-[11px] bg-[#0D0D1A] p-3
        overflow-hidden
      ">
        {/* 비디오 제목 */}
        <div className="flex items-start gap-2 mb-1.5">
          <Video className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-[#EDE9FE] line-clamp-1 leading-snug">
            {source.video_title}
          </span>
        </div>

        {/* 타임스탬프 */}
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="h-3 w-3 text-[#6B7280]" />
          <span className="text-[11px] text-[#A78BFA] font-medium">
            {source.timestamp_label}
          </span>
          <ExternalLink className="h-3 w-3 text-[#6B7280] ml-auto
                                    group-hover:text-purple-400 transition-colors" />
        </div>

        {/* 발췌 */}
        <p className="text-[11px] text-[#6B7280] italic leading-relaxed line-clamp-2">
          "{source.excerpt}"
        </p>

        {/* hover sweep 효과 */}
        <div className="
          absolute inset-0 rounded-[11px] opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          bg-gradient-to-br from-purple-600/5 to-transparent
          pointer-events-none
        " />
      </div>
    </motion.a>
  ))}
</motion.div>
```

### 4.5 ChatInput (v3 — 글래스모피즘 + 포커스 글로우)

```tsx
<div className="
  fixed bottom-0 inset-x-0 z-30
  px-4 py-3 lg:px-6
  pb-[max(12px,env(safe-area-inset-bottom))]
  bg-gradient-to-t from-[#07070F] via-[#07070F]/95 to-transparent
  lg:pl-[calc(256px+24px)]  /* 사이드바 오프셋 */
">
  <div className="
    mx-auto max-w-3xl
    relative flex items-end gap-2
    rounded-2xl
    bg-[#0D0D1A]/80 backdrop-blur-xl
    border border-[#1C1C3A]
    px-4 py-3
    transition-all duration-200
    focus-within:border-purple-600/60
    focus-within:shadow-[0_0_20px_rgba(124,58,237,0.15),0_0_40px_rgba(124,58,237,0.08)]
  ">
    <textarea
      rows={1}
      placeholder="sv.developer 영상에 대해 무엇이든 물어보세요..."
      className="
        flex-1 resize-none bg-transparent outline-none
        text-[#EDE9FE] text-sm leading-relaxed
        placeholder:text-[#374151]
        max-h-36 overflow-y-auto
        scrollbar-thin scrollbar-thumb-[#1C1C3A] scrollbar-track-transparent
      "
      onInput={(e) => autoResize(e.currentTarget)}
    />

    <motion.button
      type="submit"
      disabled={!query.trim() || isLoading}
      whileTap={{ scale: 0.92 }}
      className="
        flex-shrink-0 h-9 w-9 rounded-xl
        bg-gradient-to-br from-purple-600 to-purple-400
        flex items-center justify-center
        shadow-[var(--glow-sm)]
        hover:shadow-[var(--glow-md)] hover:brightness-110
        disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
        transition-all duration-150
      "
    >
      {isLoading
        ? <Loader2 className="h-4 w-4 text-white animate-spin" />
        : <SendHorizonal className="h-4 w-4 text-white" />
      }
    </motion.button>
  </div>

  {/* 입력 힌트 텍스트 */}
  <p className="text-center text-[10px] text-[#374151] mt-1.5">
    Enter로 전송 · Shift+Enter 줄바꿈
  </p>
</div>
```

### 4.6 TypingIndicator (v3)

```tsx
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-1">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-700 to-purple-400
                      flex items-center justify-center shadow-[var(--glow-sm)]">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-[#0D0D1A] border border-[#1C1C3A] px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-2 w-2 rounded-full bg-purple-600"
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 4.7 온보딩 카드 (v3 — Aurora + Gradient Border)

```tsx
export function OnboardingCard({ onLogin, onSkip }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...springHeavy, delay: 0.1 }}
        className="relative w-full max-w-md"
      >
        {/* 배경 글로우 */}
        <div className="absolute inset-0 rounded-2xl bg-purple-600/10 blur-3xl scale-110" />

        {/* 그라디언트 보더 카드 */}
        <div className="relative rounded-2xl p-[1px]
                        bg-gradient-to-br from-purple-600/60 via-purple-400/20 to-transparent">
          <div className="rounded-[15px] bg-[#0D0D1A] px-8 py-10 text-center">

            {/* 로고 */}
            <motion.div
              className="mx-auto mb-6 h-16 w-16 rounded-2xl
                         bg-gradient-to-br from-purple-600 to-purple-300
                         flex items-center justify-center
                         shadow-[var(--glow-lg)]"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>

            {/* 제목 — 그라디언트 텍스트 */}
            <h1 className="text-3xl font-bold mb-2
                           bg-gradient-to-r from-purple-300 via-purple-200 to-white
                           bg-clip-text text-transparent">
              SV Dev RAG
            </h1>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
              sv.developer 채널의 모든 영상 내용을<br />
              AI가 출처와 함께 답변해드려요
            </p>

            {/* Google 로그인 버튼 */}
            <motion.button
              onClick={onLogin}
              whileTap={{ scale: 0.97 }}
              className="
                w-full flex items-center justify-center gap-3
                rounded-xl bg-white px-4 py-3
                text-sm font-semibold text-gray-700
                hover:bg-gray-50 active:bg-gray-100
                transition-colors duration-150
                shadow-sm
              "
            >
              <GoogleIcon className="h-5 w-5" />
              Google로 로그인하기
            </motion.button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1C1C3A]" />
              </div>
              <span className="relative bg-[#0D0D1A] px-3 text-xs text-[#374151]">또는</span>
            </div>

            <button
              onClick={onSkip}
              className="text-sm text-[#6B7280] hover:text-[#A78BFA] underline-offset-4
                         hover:underline transition-colors duration-150"
            >
              로그인 없이 시작하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
```

### 4.8 EmptyState (검색 결과 없음)

```tsx
export function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={easeOut}
      className="flex items-start gap-3 px-4 py-1"
    >
      <div className="h-8 w-8 rounded-lg bg-[#13132A] border border-[#1C1C3A]
                      flex items-center justify-center">
        <SearchX className="h-4 w-4 text-[#6B7280]" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-[#0D0D1A] border border-[#1C1C3A] px-4 py-3">
        <p className="text-sm text-[#6B7280]">
          <span className="text-[#A78BFA]">"{query}"</span>에 관련된 영상 내용을 찾지 못했습니다.
        </p>
        <p className="text-xs text-[#374151] mt-1">
          다른 키워드로 다시 질문해보세요.
        </p>
      </div>
    </motion.div>
  )
}
```

### 4.9 UserMenu 드롭다운

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-2 rounded-full p-1
                       hover:bg-[#16163A] transition-colors">
      <Image
        src={user.avatar_url}
        alt={user.name}
        width={32} height={32}
        className="rounded-full ring-2 ring-purple-600/30"
      />
    </button>
  </DropdownMenuTrigger>

  <DropdownMenuContent
    align="end"
    className="w-52 bg-[#13132A] border-[#1C1C3A] text-[#EDE9FE]"
  >
    <DropdownMenuLabel className="text-xs text-[#6B7280] font-normal">
      {user.email}
    </DropdownMenuLabel>
    <DropdownMenuSeparator className="bg-[#1C1C3A]" />
    <DropdownMenuItem
      onClick={signOut}
      className="text-sm cursor-pointer hover:bg-[#16163A] hover:text-[#EDE9FE]
                 focus:bg-[#16163A]"
    >
      <LogOut className="h-4 w-4 mr-2 text-[#6B7280]" />
      로그아웃
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 5. 반응형 상세 스펙

### 5.1 브레이크포인트별 레이아웃

| 구간 | 사이드바 | 채팅 max-w | px | 소스 카드 |
|------|----------|-----------|-----|----------|
| `< 640px` 모바일 | Bottom Sheet (토글) | 100% | 16px | 1열 |
| `640~1024px` 태블릿 | 숨김 + 헤더 버튼 | 640px | 24px | 2열 |
| `> 1024px` 데스크탑 | 고정 w-64 | 720px | 24px | 2열 |

### 5.2 모바일 전용 처리

```
- 채팅 입력창: soft keyboard 오픈 시 viewport 조정
  → dvh 단위 사용: h-[100dvh] (dynamic viewport height)
  
- 사이드바 스와이프 제스처:
  → useDragControls() + onPan으로 아래로 스와이프 시 닫기
  
- 터치 피드백:
  → active:scale-[0.98] on all interactive elements
  
- safe area:
  → pb-[env(safe-area-inset-bottom)] 모든 fixed bottom 요소
  
- 글자 크기 최소 16px (iOS 확대 방지)
```

---

## 6. 애니메이션 레시피

```typescript
// 자주 쓰는 animation variants 모음 (lib/animations.ts)

// 페이지 진입
export const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// 메시지 (개별)
export const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springPop },
}

// 소스 카드 컨테이너
export const sourceContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
export const sourceCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springPop },
}

// 사이드바 아이템
export const sidebarContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}
export const sidebarItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: easeOut },
}

// 로딩 dots
export const dotVariants = {
  animate: (i: number) => ({
    y: [0, -8, 0],
    opacity: [0.4, 1, 0.4],
    transition: { duration: 0.8, repeat: Infinity, delay: i * 0.15 },
  }),
}
```

---

## 7. shadcn 컴포넌트 커스터마이징

```typescript
// components.json → style: "new-york"
// 사용할 shadcn 컴포넌트: Button, DropdownMenu, Tooltip, ScrollArea,
//                         Separator, Skeleton, Badge

// 테마 오버라이드 (tailwind.config.ts)
// shadcn primary → purple-600
// shadcn background → bg-base
// shadcn card → bg-surface
// shadcn border → border color
// shadcn ring → purple-600
```

---

## 8. Playwright 비주얼 테스트 스펙

```typescript
// frontend/tests/e2e/visual.spec.ts
// harness가 이 파일을 자동 생성 + 실행

import { test, expect } from '@playwright/test'

test('온보딩 화면 렌더링', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveScreenshot('onboarding.png')
  await expect(page.locator('text=SV Dev RAG')).toBeVisible()
  await expect(page.locator('text=Google로 로그인하기')).toBeVisible()
})

test('채팅 메시지 전송 플로우', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('text=로그인 없이 시작하기')
  await page.fill('textarea', '하네스가 뭐야?')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible()
  await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 30000 })
})

test('모바일 반응형 (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('http://localhost:3000')
  await expect(page).toHaveScreenshot('mobile-onboarding.png')
  // 사이드바가 보이지 않아야 함
  await expect(page.locator('[data-testid="conversation-sidebar"]')).not.toBeVisible()
})

test('소스 카드 렌더링', async ({ page }) => {
  // 미리 만든 mock response로 테스트
  await page.route('**/api/v1/chat', async (route) => {
    await route.fulfill({
      json: {
        answer: '하네스는 CI/CD 도구입니다.',
        sources: [{
          video_title: '하네스 세팅하기',
          timestamp_label: '13분 12초',
          timestamp_url: 'https://youtu.be/test?t=792',
          excerpt: '하네스는...',
        }],
        confidence: 0.92,
        cached: false,
      },
    })
  })
  await page.goto('http://localhost:3000')
  await page.click('text=로그인 없이 시작하기')
  await page.fill('textarea', '하네스가 뭐야?')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-testid="source-card"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('text=하네스 세팅하기')).toBeVisible()
  await expect(page.locator('text=13분 12초')).toBeVisible()
  await expect(page).toHaveScreenshot('source-cards.png')
})

test('다크 테마 확인', async ({ page }) => {
  await page.goto('http://localhost:3000')
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor
  )
  // #07070F = rgb(7, 7, 15)
  expect(bg).toBe('rgb(7, 7, 15)')
})
```
