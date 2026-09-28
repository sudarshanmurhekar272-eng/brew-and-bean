import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { createBooking, createOrder, type Order } from '@workspace/api-client-react';
import { ArrowDown, ArrowRight, Bean, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Heart, Instagram, LogIn, Mail, MapPin, Menu as MenuIcon, Minus, Moon, Phone, Plus, Search, ShoppingBag, Sparkles, Star, Sun, Timer, X } from 'lucide-react';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import heroImage from '../attached_assets/generated_images/cafe-hero.jpg';

type Category = 'Espresso' | 'Filter' | 'Tea & more' | 'Bakery';
type Product = { id: number; name: string; description: string; price: number; category: Category; note: string; art: string; featured?: boolean };
type CartItem = Product & { quantity: number; size: string; milk: string };

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#9f6a43',
    colorForeground: '#2c211a',
    colorMutedForeground: '#75665b',
    colorDanger: '#b44c3c',
    colorBackground: '#f4ede1',
    colorInput: '#fffaf1',
    colorInputForeground: '#2c211a',
    colorNeutral: '#d8cabb',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#f4ede1] rounded-[1.5rem] w-[440px] max-w-full overflow-hidden shadow-2xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#2c211a] font-serif',
    headerSubtitle: 'text-[#75665b]',
    socialButtonsBlockButtonText: 'text-[#2c211a]',
    formFieldLabel: 'text-[#2c211a]',
    footerActionLink: 'text-[#9f6a43]',
    footerActionText: 'text-[#75665b]',
    dividerText: 'text-[#75665b]',
    alertText: 'text-[#7d2f28]',
    logoBox: 'mb-4',
    logoImage: 'h-10 w-10',
    socialButtonsBlockButton: 'border-[#d8cabb] bg-[#fffaf1] hover:bg-[#ead9c1]',
    formButtonPrimary: 'bg-[#2c211a] hover:bg-[#9f6a43] text-[#fffaf1]',
    formFieldInput: 'border-[#d8cabb] bg-[#fffaf1] text-[#2c211a]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d8cabb]',
    alert: 'bg-[#f7ded8] border-[#e0a097]',
    otpCodeFieldInput: 'border-[#d8cabb] bg-[#fffaf1]',
    formFieldRow: 'mb-4',
    main: 'gap-5',
  },
};

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const products: Product[] = [
  { id: 1, name: 'The House Cortado', description: 'Double ristretto, silky steamed milk, orange zest.', price: 5.5, category: 'Espresso', note: 'Bright · silky · citrus', art: 'cup-cortado', featured: true },
  { id: 2, name: 'Velvet Oat Latte', description: 'Our signature espresso with toasted oat milk.', price: 6.25, category: 'Espresso', note: 'Toasted · creamy · soft', art: 'cup-latte', featured: true },
  { id: 3, name: 'Cold Bloom', description: '18-hour cold brew, black cherry, cacao nib.', price: 5.75, category: 'Filter', note: 'Round · dark fruit · cool', art: 'cup-cold' },
  { id: 4, name: 'Cascara Spritz', description: 'Dried coffee cherry, bergamot, sparkling water.', price: 5, category: 'Tea & more', note: 'Floral · sparkling · bright', art: 'cup-spritz' },
  { id: 5, name: 'Miso Morning Bun', description: 'Laminated pastry, brown butter, white miso glaze.', price: 6, category: 'Bakery', note: 'Buttery · caramel · umami', art: 'bakery-bun', featured: true },
  { id: 6, name: 'Darkroom Mocha', description: 'Single-origin chocolate, espresso, sea salt cream.', price: 6.75, category: 'Espresso', note: 'Deep · bittersweet · lush', art: 'cup-mocha' },
  { id: 7, name: 'Sunroom Pour Over', description: 'A rotating washed lot brewed to order.', price: 7, category: 'Filter', note: 'Seasonal · clean · expressive', art: 'cup-pourover' },
  { id: 8, name: 'Cardamom Knot', description: 'Warm spice, pearl sugar, laminated brioche.', price: 5.25, category: 'Bakery', note: 'Spiced · tender · warm', art: 'bakery-knot' },
];

const reviews = [
  { quote: 'The kind of place that makes you protect an hour in your calendar just to sit still.', name: 'Mara L.', role: 'Neighbourhood regular', initials: 'ML' },
  { quote: 'Every detail feels considered, from the first sip to the little brass timer on the table.', name: 'Jonas K.', role: 'Weekend visitor', initials: 'JK' },
  { quote: 'The House Cortado is quietly one of the best coffees I have had in the city.', name: 'Priya S.', role: 'Coffee obsessive', initials: 'PS' },
];

const faqs = [
  ['Do you take walk-ins?', 'Always. We keep a generous number of seats for walk-ins, alongside a small number of bookable tables for slower gatherings.'],
  ['Do you have non-dairy milk?', 'Yes — oat milk is our house favourite. We also serve almond and coconut milk, with no extra charge.'],
  ['Can I buy your beans to brew at home?', 'Of course. Our current single-origin and house espresso are available by the bag in the café and online soon.'],
  ['Are dogs welcome?', 'Well-behaved dogs are welcome in the front room and courtyard. We keep the back room quiet for focused work.'],
];

function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: .12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`${visible ? 'reveal' : 'opacity-0 translate-y-5'} ${className}`}>{children}</div>;
}

function SectionIntro({ kicker, title, copy, light = false }: { kicker: string; title: React.ReactNode; copy: string; light?: boolean }) {
  return (
    <div className={`max-w-2xl ${light ? 'text-[hsl(var(--background))]' : ''}`}>
      <div className="eyebrow text-[hsl(var(--accent))] mb-5">{kicker}</div>
      <h2 className="serif text-4xl sm:text-5xl md:text-6xl leading-[.98] tracking-[-.035em]">{title}</h2>
      <p className={`mt-6 text-base leading-7 max-w-lg ${light ? 'text-[hsl(var(--background)/.68)]' : 'text-[hsl(var(--muted-foreground))]'}`}>{copy}</p>
    </div>
  );
}

function ProductArt({ art, large = false }: { art: string; large?: boolean }) {
  return (
    <div className={`product-art ${art} ${large ? 'h-72' : 'h-48'} relative overflow-hidden`}>
      <div className="art-glow" />
      {art.includes('bakery') ? <div className="pastry-shape" /> : <><div className="cup-shadow" /><div className="cup-shape"><span /></div></>}
      <span className="art-grain" />
    </div>
  );
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation();
  return (
    <div className="grain flex min-h-[100dvh] items-center justify-center bg-[#29211b] px-5 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(221,174,103,.24),transparent_28%),linear-gradient(135deg,#29211b,#19130f)]" />
      <div className="relative w-full max-w-5xl">
        <button onClick={() => setLocation('/')} className="mx-auto mb-8 flex items-center justify-center gap-3 text-[#f4ede1]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8ddcc]/50"><Bean size={17} /></span>
          <span className="text-[11px] font-bold tracking-[.22em]">BREW <span className="text-[#ddae67]">&</span> BEAN</span>
        </button>
        <div className="grid overflow-hidden rounded-[2rem] border border-[#e8ddcc]/15 bg-[#f4ede1]/95 shadow-2xl lg:grid-cols-[.82fr_1.18fr]">
          <div className="hidden flex-col justify-between bg-[#36271e] p-10 text-[#f4ede1] lg:flex">
            <div><div className="eyebrow text-[#ddae67]">A little room for you</div><h1 className="serif mt-5 text-5xl leading-[.95]">Come in,<br /><i>stay awhile.</i></h1><p className="mt-6 max-w-xs text-sm leading-7 text-[#e8ddcc]/65">Save your favourite pours, keep tabs on orders, and make your next café visit feel like coming home.</p></div>
            <div className="border-t border-[#e8ddcc]/20 pt-5 text-xs text-[#e8ddcc]/55">17 Mercer Lane · Fitzroy<br />Open daily, 07:00 — 18:00</div>
          </div>
          <div className="flex items-center justify-center p-5 sm:p-10">
            {mode === 'sign-in' ? <SignIn routing="path" path="/sign-in" signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={basePath || '/'} appearance={clerkAppearance} /> : <SignUp routing="path" path="/sign-up" signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={basePath || '/'} appearance={clerkAppearance} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [dark, setDark] = useState(() => localStorage.getItem('brew-theme') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [category, setCategory] = useState<'All' | Category>('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [booked, setBooked] = useState(false);
  const [customProduct, setCustomProduct] = useState<Product | null>(null);
  const [size, setSize] = useState('Regular');
  const [milk, setMilk] = useState('Whole milk');
  const [quantity, setQuantity] = useState(1);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [partySize, setPartySize] = useState(2);
  const [review, setReview] = useState(0);
  const [newsletter, setNewsletter] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('brew-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === 'All' || product.category === category;
    const query = search.toLowerCase();
    return matchesCategory && (!query || `${product.name} ${product.description} ${product.note}`.toLowerCase().includes(query));
  }), [category, search]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const toggleFavorite = (id: number) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const addToCart = (product: Product, chosenSize = 'Regular', chosenMilk = 'Whole milk', chosenQuantity = 1) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id && item.size === chosenSize && item.milk === chosenMilk);
      if (existing) return current.map((item) => item === existing ? { ...item, quantity: item.quantity + chosenQuantity } : item);
      return [...current, { ...product, quantity: chosenQuantity, size: chosenSize, milk: chosenMilk }];
    });
    setCustomProduct(null);
    setCartOpen(true);
    setQuantity(1);
    setSize('Regular');
    setMilk('Whole milk');
  };
  const updateCartItem = (index: number, delta: number) => setCart((current) => current.flatMap((item, itemIndex) => itemIndex === index ? (item.quantity + delta > 0 ? [{ ...item, quantity: item.quantity + delta }] : []) : [item]));
  const placeOrder = async () => {
    if (!cart.length || orderSubmitting) return;
    setOrderSubmitting(true);
    try {
      const order = await createOrder({
        customerName: user?.fullName || 'Guest',
        customerEmail: user?.primaryEmailAddress?.emailAddress || 'guest@brewandbean.local',
        orderType: 'pickup',
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          size: item.size,
          milk: item.milk,
          unitPrice: item.price,
        })),
        total: Number(cartTotal.toFixed(2)),
      });
      setOrderPlaced(order);
      setCart([]);
    } finally {
      setOrderSubmitting(false);
    }
  };
  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (bookingSubmitting) return;
    setBookingSubmitting(true);
    setBookingError('');
    const data = new FormData(event.currentTarget);
    try {
      await createBooking({
        name: String(data.get('name') || ''),
        email: String(data.get('email') || ''),
        date: String(data.get('date') || ''),
        time: String(data.get('time') || ''),
        partySize,
      });
      setBooked(true);
    } catch {
      setBookingError('We could not hold that table just yet. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };
  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-hidden">
      <header className="fixed top-0 z-40 w-full border-b border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--background)/.86)] backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <button data-testid="button-brand-home" onClick={() => scrollTo('top')} className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--foreground)/.4)] transition group-hover:rotate-12"><Bean size={16} strokeWidth={1.5} /></span>
            <span className="text-[11px] font-bold tracking-[.22em]">BREW <span className="text-[hsl(var(--accent))]">&</span> BEAN</span>
          </button>
          <nav className="hidden items-center gap-8 lg:flex">
            {[['menu', 'Menu'], ['story', 'Our story'], ['visit', 'Visit us'], ['events', 'Events']].map(([id, label]) => <button data-testid={`button-nav-${id}`} key={id} onClick={() => scrollTo(id)} className="line-link text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">{label}</button>)}
          </nav>
          <div className="flex items-center gap-2">
            <button data-testid="button-theme-toggle" aria-label="Toggle theme" onClick={() => setDark(!dark)} className="hidden h-9 w-9 items-center justify-center rounded-full hover:bg-[hsl(var(--foreground)/.08)] sm:flex">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
             {user ? <button data-testid="button-profile" onClick={() => signOut({ redirectUrl: basePath || '/' })} className="hidden items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.2)] px-3 py-2 text-xs sm:flex"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] text-[hsl(var(--accent-foreground))]">{user.firstName?.[0] || 'B'}</span>{user.firstName || 'Account'}</button> : <button data-testid="button-login" onClick={() => setLocation('/sign-in')} className="hidden items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.2)] px-3 py-2 text-xs sm:flex"><LogIn size={14} /> Sign in</button>}
            <button data-testid="button-open-cart" onClick={() => setCartOpen(true)} className="relative flex h-10 items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.2)] px-3 text-xs transition hover:border-[hsl(var(--accent))]"><ShoppingBag size={15} /><span className="hidden sm:inline">Order ahead</span>{cartCount > 0 && <b className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px]">{cartCount}</b>}</button>
            <button data-testid="button-mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(!mobileOpen)} className="flex h-10 w-10 items-center justify-center lg:hidden">{mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}</button>
          </div>
        </div>
        {mobileOpen && <div className="border-t border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--background))] px-5 py-5 lg:hidden">
          <div className="grid gap-4">{[['menu', 'Menu'], ['story', 'Our story'], ['visit', 'Visit us'], ['events', 'Events']].map(([id, label]) => <button data-testid={`button-mobile-nav-${id}`} key={id} onClick={() => scrollTo(id)} className="text-left text-2xl serif">{label}</button>)}</div>
          <button data-testid="button-mobile-theme" onClick={() => setDark(!dark)} className="mt-5 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">{dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? 'Light room' : 'Dark room'}</button>
        </div>}
      </header>

      <main id="top">
        <section className="relative flex min-h-[730px] items-end overflow-hidden bg-[#29211b] pt-[74px]">
          <img src={heroImage} alt="Sunlit Brew and Bean café interior" className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#19130f]/90 via-[#19130f]/50 to-[#19130f]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#19130f]/75 via-transparent to-[#19130f]/20" />
          <div className="relative mx-auto grid w-full max-w-[1280px] gap-12 px-5 pb-16 pt-28 lg:grid-cols-[1fr_360px] lg:items-end lg:px-8 lg:pb-24">
            <div className="max-w-3xl text-[#f4ede1]">
              <div className="reveal eyebrow mb-6 text-[#ddae67]">A coffee ritual, in full colour</div>
              <h1 className="reveal reveal-1 serif text-[clamp(3.8rem,9vw,8.5rem)] leading-[.86] tracking-[-.065em]">Make room<br /><i>for good.</i></h1>
              <p className="reveal reveal-2 mt-8 max-w-md text-base leading-7 text-[#e8ddcc]/80">A neighbourhood café for slow mornings, sharp ideas, and the little pause between one thing and the next.</p>
              <div className="reveal reveal-3 mt-9 flex flex-wrap gap-3">
                <button data-testid="button-hero-menu" onClick={() => scrollTo('menu')} className="group flex items-center gap-4 rounded-full bg-[#e8d3b4] px-5 py-3 text-xs font-bold text-[#29211b] transition hover:bg-[#f4e7d2]">Explore the menu <ArrowRight size={15} className="transition group-hover:translate-x-1" /></button>
                <button data-testid="button-hero-book" onClick={() => setBookingOpen(true)} className="flex items-center gap-3 rounded-full border border-[#e8ddcc]/40 px-5 py-3 text-xs font-bold text-[#f4ede1] transition hover:border-[#ddae67] hover:text-[#ddae67]">Book a table <CalendarDays size={15} /></button>
              </div>
            </div>
            <div className="reveal reveal-4 flex items-end justify-between border-t border-[#e8ddcc]/30 pt-5 text-[#e8ddcc]/75 lg:block lg:border-l lg:border-t-0 lg:pl-8">
              <div><div className="eyebrow mb-2 text-[#ddae67]">Open today</div><p className="text-sm">07:00 — 18:00</p></div>
              <div className="mt-0 text-right lg:mt-9 lg:text-left"><div className="eyebrow mb-2 text-[#ddae67]">Find us</div><p className="text-sm">17 Mercer Lane, Fitzroy</p></div>
            </div>
          </div>
          <button data-testid="button-scroll-menu" onClick={() => scrollTo('menu')} className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[10px] tracking-[.2em] text-[#e8ddcc]/60 md:flex">SCROLL TO TASTE <ArrowDown size={14} /></button>
        </section>

        <div className="overflow-hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.42)] py-4">
          <div className="marquee flex w-max items-center gap-8 text-[10px] tracking-[.22em] text-[hsl(var(--muted-foreground))]"><span>CRAFTED COFFEE</span><span className="text-[hsl(var(--accent))]">·</span><span>UNFORGETTABLE MOMENTS</span><span className="text-[hsl(var(--accent))]">·</span><span>ROASTED WITH CARE</span><span className="text-[hsl(var(--accent))]">·</span><span>CRAFTED COFFEE</span><span className="text-[hsl(var(--accent))]">·</span><span>UNFORGETTABLE MOMENTS</span><span className="text-[hsl(var(--accent))]">·</span><span>ROASTED WITH CARE</span></div>
        </div>

        <section id="menu" className="section-pad">
          <Reveal><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><SectionIntro kicker="The good stuff" title={<>A menu with<br /><i>somewhere to go.</i></>} copy="We follow the seasons, chase the good lots, and leave enough room for the classics. Everything is made to order, never in a hurry." /><a href="#menu-grid" className="line-link mb-1 flex items-center gap-3 text-xs font-bold">View all drinks <ArrowDown size={14} /></a></div></Reveal>
          <Reveal className="mt-14"><div className="flex flex-col gap-4 border-b border-t border-[hsl(var(--border))] py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2 overflow-x-auto hide-scrollbar">{(['All', 'Espresso', 'Filter', 'Tea & more', 'Bakery'] as const).map((item) => <button data-testid={`button-filter-${item.replace(/\W/g, '').toLowerCase()}`} key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs transition ${category === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))]'}`}>{item}</button>)}</div><label className="flex items-center gap-2 border-b border-[hsl(var(--border))] py-2 text-xs text-[hsl(var(--muted-foreground))] sm:w-48"><Search size={15} /><input data-testid="input-menu-search" aria-label="Search menu" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu" className="w-full bg-transparent outline-none placeholder:text-[hsl(var(--muted-foreground))]" /></label></div></Reveal>
          <div id="menu-grid" className="mt-8 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product, index) => <Reveal key={product.id} className={`reveal-${(index % 4) + 1}`}><article data-testid={`card-product-${product.id}`} className="menu-card group relative overflow-hidden rounded-[1.25rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))]">
              <div className="relative"><ProductArt art={product.art} /><button data-testid={`button-favorite-${product.id}`} aria-label={`Favorite ${product.name}`} onClick={() => toggleFavorite(product.id)} className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition ${favorites.includes(product.id) ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'border-white/40 bg-black/10 text-white hover:bg-black/25'}`}><Heart size={15} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} /></button>{product.featured && <span className="absolute bottom-3 left-3 rounded-full bg-[hsl(var(--accent))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-[hsl(var(--accent-foreground))]">House favourite</span>}</div>
              <div className="p-5"><div className="mb-2 flex items-start justify-between gap-2"><h3 className="serif text-xl">{product.name}</h3><span className="mono text-xs text-[hsl(var(--muted-foreground))]">{formatPrice(product.price)}</span></div><p className="min-h-10 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{product.description}</p><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><span className="text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">{product.note}</span><button data-testid={`button-add-product-${product.id}`} onClick={() => product.category === 'Bakery' ? addToCart(product) : setCustomProduct(product)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"><Plus size={15} /></button></div></div>
            </article></Reveal>)}
          </div>
          {filteredProducts.length === 0 && <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] py-16 text-center"><Search className="mx-auto mb-3 text-[hsl(var(--accent))]" size={22} /><p className="serif text-2xl">Nothing by that name.</p><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try a different sip or clear your search.</p><button data-testid="button-clear-search" onClick={() => setSearch('')} className="mt-5 text-xs underline">Clear search</button></div>}
        </section>

        <section className="section-pad bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          <Reveal><div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]"><div><div className="eyebrow mb-5 text-[hsl(var(--accent))]">This month at Brew & Bean</div><h2 className="serif max-w-2xl text-5xl leading-[.95] tracking-[-.04em] md:text-7xl">Good things,<br /><i>in season.</i></h2><p className="mt-7 max-w-md text-sm leading-7 text-[hsl(var(--primary-foreground)/.7)]">Our seasonal menu is a small love letter to what is growing, blooming, and tasting best right now.</p><button data-testid="button-seasonal-order" onClick={() => { setCategory('All'); scrollTo('menu'); }} className="mt-8 flex items-center gap-3 border-b border-[hsl(var(--accent))] pb-2 text-xs font-bold text-[hsl(var(--accent))]">Taste the seasonal menu <ArrowRight size={14} /></button></div><div className="relative mx-auto w-full max-w-md"><div className="float relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#5b4735] shadow-2xl"><div className="absolute inset-4 rounded-[1.5rem] border border-[#e8d3b4]/30" /><div className="absolute left-[18%] top-[18%] h-40 w-40 rounded-full bg-[#c79358] opacity-60 blur-2xl" /><div className="absolute bottom-[18%] right-[15%] h-32 w-32 rounded-full bg-[#e7c58f] opacity-30 blur-2xl" /><div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-[45%] bg-[#c7a16e] shadow-[inset_-12px_-8px_0_#8f6843,0_18px_25px_rgba(0,0,0,.3)]"><span className="absolute left-5 top-3 h-14 w-20 rounded-full border-4 border-[#5d422e] opacity-80" /></div><p className="absolute bottom-7 left-7 text-[10px] uppercase tracking-[.18em] text-[#e8d3b4]">Apr — Jun / 2025</p></div><div className="absolute -bottom-5 -left-5 rounded-xl border border-[#e8d3b4]/30 bg-[#36271e] px-4 py-3 text-xs text-[#e8d3b4]"><Sparkles size={14} className="mb-2 text-[#ddae67]" />Roasted for the<br />longer afternoon</div></div></div></Reveal>
        </section>

        <section id="story" className="section-pad">
          <Reveal><div className="grid gap-16 lg:grid-cols-[.82fr_1.18fr] lg:items-center"><div><SectionIntro kicker="From seed to cup" title={<>Coffee with<br /><i>a point of view.</i></>} copy="We work directly with a small circle of growers and importers who care about the same things we do: honest flavour, considered process, and a future worth drinking to." /><div className="mt-9 flex gap-8 border-t border-[hsl(var(--border))] pt-5"><div><div className="serif text-3xl">06</div><div className="mt-1 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Origin partners</div></div><div><div className="serif text-3xl">03</div><div className="mt-1 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Roast profiles</div></div><div><div className="serif text-3xl">17</div><div className="mt-1 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Years curious</div></div></div></div><div className="relative min-h-[460px] overflow-hidden rounded-[2rem] bg-[#c6a879]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_32%,#f0d29a_0,transparent_27%),linear-gradient(135deg,#9b7653,#d8bd8a_55%,#71533d)]" /><div className="absolute right-[-5%] top-[-5%] h-[110%] w-[70%] rotate-12 rounded-[50%] bg-[#594031]/60 blur-sm" /><div className="absolute bottom-[11%] left-[11%] h-48 w-48 rounded-full border-[26px] border-[#e4c999]/80 shadow-2xl" /><div className="absolute bottom-[17%] left-[17%] h-36 w-36 rounded-full bg-[#503528] shadow-[inset_10px_8px_0_#8b6343]" /><div className="absolute left-8 top-8 max-w-40 text-[10px] uppercase leading-5 tracking-[.17em] text-[#f3dfb6]">A little more<br />care in every<br />roast.</div><div className="absolute bottom-8 right-8 text-right text-[#f3dfb6]"><div className="serif text-4xl italic">Cerro Azul</div><div className="mono mt-1 text-[9px] tracking-[.15em]">COLOMBIA · 1,650 MASL</div></div></div></div></Reveal>
        </section>

        <section className="section-pad border-y border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.32)]">
          <Reveal><div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center"><div><div className="eyebrow mb-5 text-[hsl(var(--accent))]">Meet the people behind the pour</div><h2 className="serif text-4xl leading-[.97] tracking-[-.04em] sm:text-5xl">A good cup<br /><i>takes a good team.</i></h2><p className="mt-6 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">We are a small, slightly obsessed crew who believe hospitality is mostly about paying attention.</p><button data-testid="button-meet-team" onClick={() => scrollTo('visit')} className="mt-8 flex items-center gap-3 text-xs font-bold">Meet us in the café <ArrowRight size={14} className="text-[hsl(var(--accent))]" /></button></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{['Mina / Head barista', 'Owen / Roaster', 'Ari / Pastry lead'].map((person, i) => <div key={person} className={`relative overflow-hidden rounded-2xl ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}><div className={`h-56 ${i === 0 ? 'bg-[#a7836b]' : i === 1 ? 'bg-[#6c5749]' : 'bg-[#c6a383]'}`}><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_22%,#e9c9a8_0,transparent_19%),linear-gradient(145deg,transparent_45%,rgba(35,23,16,.52))]" /><div className="absolute bottom-4 left-4 text-xs text-[#f4e5cf]">{person}<br /><span className="opacity-65">Brew & Bean, Fitzroy</span></div></div></div>)}</div></div></Reveal>
        </section>

        <section id="events" className="section-pad">
          <Reveal><div className="grid gap-12 lg:grid-cols-[1fr_.85fr]"><div><SectionIntro kicker="More than coffee" title={<>Stay for<br /><i>the good part.</i></>} copy="Our back room is made for the things that deserve a little more time: a long table, a visiting maker, a new idea." /><div className="mt-10 divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">{[['18', 'JUN', 'Cupping the Coast', 'A guided tasting of three bright Pacific lots.'], ['27', 'JUN', 'Late Light Sessions', 'Live piano, small plates, last coffees at 9pm.'], ['06', 'JUL', 'Sunday Table', 'A shared breakfast hosted by the people who grow our coffee.']].map(([date, month, title, desc]) => <button data-testid={`button-event-${title.toLowerCase().replace(/\s/g, '-')}`} key={title} onClick={() => setBookingOpen(true)} className="group grid w-full grid-cols-[52px_1fr_20px] items-center gap-4 py-5 text-left transition hover:pl-2"><div><div className="serif text-2xl leading-none">{date}</div><div className="mono mt-1 text-[9px] text-[hsl(var(--accent))]">{month}</div></div><div><h3 className="serif text-xl">{title}</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{desc}</p></div><ArrowRight size={16} className="text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1 group-hover:text-[hsl(var(--accent))]" /></button>)}</div></div><div className="relative min-h-[430px] overflow-hidden rounded-[2rem] bg-[#46342a]"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_10%,#b79673,transparent_36%),linear-gradient(145deg,#7b5c48,#2d211c)]" /><div className="absolute left-[15%] top-[10%] h-48 w-48 rounded-full bg-[#deb985]/30 blur-3xl" /><div className="absolute bottom-[-15%] right-[-3%] h-80 w-56 rotate-12 rounded-[45%] bg-[#19130f]/75" /><div className="absolute left-8 top-8 text-[#f1ddbe]"><div className="eyebrow text-[#ddae67]">Next up</div><p className="serif mt-3 text-4xl">Cupping<br /><i>the Coast</i></p></div><div className="absolute bottom-8 left-8 right-8 flex items-end justify-between text-[#f1ddbe]"><span className="text-xs">Wednesday, 18 June<br /><span className="opacity-60">6:30 — 8:00 pm</span></span><span className="rounded-full border border-[#f1ddbe]/40 px-3 py-2 text-[10px]">12 seats left</span></div></div></div></Reveal>
        </section>

        <section className="section-pad bg-[#201813] text-[#f1e6d5]">
          <Reveal><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><div className="eyebrow mb-5 text-[#ddae67]">Kind words</div><h2 className="serif text-5xl leading-[.95] tracking-[-.04em]">People come<br /><i>back for this.</i></h2></div><div><div className="min-h-[190px]"><div className="mb-6 flex gap-1 text-[#ddae67]">{[1, 2, 3, 4, 5].map((item) => <Star key={item} size={14} fill="currentColor" />)}</div><blockquote className="serif max-w-2xl text-2xl leading-[1.15] md:text-4xl">“{reviews[review].quote}”</blockquote><div className="mt-7 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8f6648] text-xs">{reviews[review].initials}</span><span className="text-xs">{reviews[review].name}<span className="ml-2 text-[#f1e6d5]/45">/ {reviews[review].role}</span></span></div></div><div className="mt-8 flex gap-2"><button data-testid="button-review-previous" aria-label="Previous review" onClick={() => setReview((review + reviews.length - 1) % reviews.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f1e6d5]/25 hover:border-[#ddae67]"><ChevronLeft size={16} /></button><button data-testid="button-review-next" aria-label="Next review" onClick={() => setReview((review + 1) % reviews.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f1e6d5]/25 hover:border-[#ddae67]"><ChevronRight size={16} /></button></div></div></div></Reveal>
        </section>

        <section className="section-pad">
          <Reveal><div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]"><div><SectionIntro kicker="A little extra" title={<>Good coffee<br /><i>comes around.</i></>} copy="Join the Slow Pour Club for first taste of new lots, one drink on us every ninth visit, and invitations worth making room for." /><div className="mt-8 flex items-center gap-4"><button data-testid="button-join-rewards" onClick={() => document.getElementById('newsletter')?.focus()} className="rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]">Join the club</button><span className="text-xs text-[hsl(var(--muted-foreground))]">No points. Just good things.</span></div></div><div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] p-7 sm:p-10"><div className="absolute right-[-50px] top-[-50px] h-64 w-64 rounded-full border border-[hsl(var(--accent)/.4)]" /><div className="absolute right-[-20px] top-[-20px] h-48 w-48 rounded-full border border-[hsl(var(--accent)/.3)]" /><div className="eyebrow text-[hsl(var(--accent))]">Slow Pour Club / 001</div><div className="mt-16 flex items-end justify-between"><div><p className="serif text-4xl">Your next<br /><i>good thing.</i></p><p className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">A small ritual, delivered.</p></div><Bean size={80} strokeWidth={.7} className="rotate-45 text-[hsl(var(--accent))]" /></div><div className="absolute bottom-5 left-7 right-7 flex justify-between text-[10px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]"><span>Member since today</span><span>BREW & BEAN</span></div></div></div></Reveal>
        </section>

        <section id="visit" className="section-pad bg-[hsl(var(--secondary)/.4)]">
          <Reveal><div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#80634c]"><div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(206,171,127,.8),transparent_42%),linear-gradient(315deg,#39271e,#ad8a66)]" /><div className="absolute left-[12%] top-[18%] h-28 w-28 rounded-[35%] border-[15px] border-[#e4c89f]/80" /><div className="absolute right-[12%] top-[8%] h-48 w-28 rounded-t-full bg-[#241a16]/80" /><div className="absolute bottom-0 left-0 h-[38%] w-full bg-[#241a16]/70" /><div className="absolute bottom-10 left-8 text-[#f2dec1]"><div className="serif text-4xl">Your table<br /><i>is waiting.</i></div><div className="mt-5 flex gap-4 text-xs"><span><Clock3 size={13} className="mr-1 inline" /> 07—18 daily</span><span><MapPin size={13} className="mr-1 inline" /> Fitzroy</span></div></div></div><div><SectionIntro kicker="Come say hello" title={<>Find your<br /><i>slow corner.</i></>} copy="One sunlit room, one leafy courtyard, and enough good seats to make a morning of it. We are on Mercer Lane, five minutes from the market." /><div className="mt-8 grid grid-cols-2 gap-6 border-t border-[hsl(var(--border))] pt-5 text-xs"><div><div className="eyebrow mb-2 text-[hsl(var(--accent))]">Opening hours</div><p>Mon — Fri / 7 — 6<br />Sat — Sun / 8 — 5</p></div><div><div className="eyebrow mb-2 text-[hsl(var(--accent))]">Get in touch</div><p>03 9417 2084<br />hello@brewandbean.au</p></div></div><button data-testid="button-book-table" onClick={() => setBookingOpen(true)} className="mt-8 flex items-center gap-3 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]">Book a table <CalendarDays size={15} /></button></div></div></Reveal>
        </section>

        <section className="section-pad">
          <Reveal><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><SectionIntro kicker="A few answers" title={<>Before you<br /><i>come through.</i></>} copy="The practical bits, answered with the same care as the coffee." /></div><div className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">{faqs.map(([question, answer], index) => <div key={question}><button data-testid={`button-faq-${index}`} onClick={() => setActiveFaq(activeFaq === index ? null : index)} className="flex w-full items-center justify-between py-5 text-left"><span className="serif text-xl">{question}</span><ChevronDown size={17} className={`transition ${activeFaq === index ? 'rotate-180 text-[hsl(var(--accent))]' : ''}`} /></button>{activeFaq === index && <p className="max-w-xl pb-5 pr-10 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{answer}</p>}</div>)}</div></div></Reveal>
        </section>

        <section className="relative overflow-hidden bg-[hsl(var(--accent))] px-5 py-20 text-[hsl(var(--accent-foreground))] sm:px-8">
          <div className="absolute -right-10 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-[hsl(var(--accent-foreground)/.18)]" /><div className="absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full border border-[hsl(var(--accent-foreground)/.12)]" />
          <Reveal><div className="relative mx-auto flex max-w-[1280px] flex-col justify-between gap-9 md:flex-row md:items-end"><div><div className="eyebrow mb-5 opacity-65">Keep in touch</div><h2 className="serif max-w-2xl text-5xl leading-[.95] tracking-[-.04em] md:text-6xl">Good news,<br /><i>once in a while.</i></h2></div><div className="w-full max-w-sm"><p className="mb-4 text-sm leading-6 opacity-75">New beans, late-night tables, and the occasional excuse to leave work early.</p>{subscribed ? <div className="flex items-center gap-2 border-b border-[hsl(var(--accent-foreground)/.6)] py-3 text-sm"><Check size={16} /> You are on the list.</div> : <form onSubmit={(event) => { event.preventDefault(); if (newsletter) setSubscribed(true); }} className="flex border-b border-[hsl(var(--accent-foreground)/.6)] py-2"><input id="newsletter" data-testid="input-newsletter" aria-label="Email address" type="email" required value={newsletter} onChange={(event) => setNewsletter(event.target.value)} placeholder="Your email address" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--accent-foreground)/.6)]" /><button data-testid="button-newsletter-submit" aria-label="Join mailing list" className="pl-3"><ArrowRight size={18} /></button></form>}</div></div></Reveal>
        </section>

         <section className="relative overflow-hidden bg-[#ead9c1] px-5 py-20 text-[#2c211a] sm:px-8">
           <div className="absolute -left-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-[#9f6a43]/20" />
           <div className="absolute -left-5 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full border border-[#9f6a43]/20" />
           <Reveal><div className="relative mx-auto max-w-[1280px] text-center"><div className="eyebrow mb-5 text-[#9f6a43]">Until next time</div><h2 className="serif mx-auto max-w-3xl text-5xl leading-[.94] tracking-[-.04em] md:text-7xl">Thanks for visiting<br /><i>our little café.</i></h2><p className="mx-auto mt-6 max-w-md text-sm leading-7 text-[#75665b]">Whether you stopped by for a quick cortado or stayed for the slow morning, we are glad you made room for good.</p><button data-testid="button-thanks-home" onClick={() => scrollTo('top')} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#2c211a] px-5 py-3 text-xs font-bold text-[#fffaf1] transition hover:bg-[#9f6a43]">Come back soon <ArrowRight size={14} /></button></div></Reveal>
         </section>

        <footer className="bg-[hsl(var(--primary))] px-5 pb-8 pt-16 text-[hsl(var(--primary-foreground))] sm:px-8">
          <div className="mx-auto max-w-[1280px]"><div className="grid gap-12 border-b border-[hsl(var(--primary-foreground)/.18)] pb-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_.7fr_.7fr_.8fr]"><div><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--primary-foreground)/.5)]"><Bean size={16} strokeWidth={1.5} /></span><span className="text-[11px] font-bold tracking-[.22em]">BREW <span className="text-[hsl(var(--accent))]">&</span> BEAN</span></div><p className="mt-6 max-w-xs text-sm leading-6 text-[hsl(var(--primary-foreground)/.6)]">Crafted coffee. Unforgettable moments. Find your slow corner in Fitzroy.</p><div className="mt-6 flex gap-2"><a data-testid="link-instagram" href="https://instagram.com" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--primary-foreground)/.25)] hover:border-[hsl(var(--accent))]"><Instagram size={14} /></a><a data-testid="link-email" href="mailto:hello@brewandbean.au" aria-label="Email"><Mail size={14} /></a></div></div><div><div className="eyebrow mb-5 text-[hsl(var(--accent))]">Explore</div><div className="grid gap-3 text-sm text-[hsl(var(--primary-foreground)/.66)]"><button data-testid="button-footer-menu" onClick={() => scrollTo('menu')} className="text-left hover:text-[hsl(var(--primary-foreground))]">Menu</button><button data-testid="button-footer-story" onClick={() => scrollTo('story')} className="text-left hover:text-[hsl(var(--primary-foreground))]">Our story</button><button data-testid="button-footer-events" onClick={() => scrollTo('events')} className="text-left hover:text-[hsl(var(--primary-foreground))]">Events</button></div></div><div><div className="eyebrow mb-5 text-[hsl(var(--accent))]">Visit</div><p className="text-sm leading-6 text-[hsl(var(--primary-foreground)/.66)]">17 Mercer Lane<br />Fitzroy VIC 3065<br /><br />03 9417 2084</p></div><div><div className="eyebrow mb-5 text-[hsl(var(--accent))]">Say hello</div><a data-testid="link-footer-email" href="mailto:hello@brewandbean.au" className="text-sm text-[hsl(var(--primary-foreground)/.66)] hover:text-[hsl(var(--primary-foreground))]">hello@brewandbean.au</a><p className="mt-4 text-xs leading-5 text-[hsl(var(--primary-foreground)/.45)]">Questions, celebrations,<br />excellent coffee.</p></div></div><div className="flex flex-col justify-between gap-3 pt-6 text-[10px] uppercase tracking-[.14em] text-[hsl(var(--primary-foreground)/.4)] sm:flex-row"><span>© 2025 Brew & Bean Coffee Co.</span><span>Made for slow mornings</span></div></div>
        </footer>
      </main>

      {customProduct && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#211710]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setCustomProduct(null)}><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-t-[1.5rem] bg-[hsl(var(--card))] p-6 sm:rounded-[1.5rem] sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><div className="eyebrow text-[hsl(var(--accent))]">Make it yours</div><h2 className="serif mt-2 text-3xl">{customProduct.name}</h2></div><button data-testid="button-close-customize" onClick={() => setCustomProduct(null)}><X size={20} /></button></div><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{customProduct.description}</p><div className="mt-7"><div className="eyebrow mb-3">Size</div><div className="grid grid-cols-3 gap-2">{['Short', 'Regular', 'Large'].map((item) => <button data-testid={`button-size-${item.toLowerCase()}`} key={item} onClick={() => setSize(item)} className={`rounded-lg border px-3 py-3 text-xs ${size === item ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]' : 'border-[hsl(var(--border))]'}`}>{item}<br /><span className="mt-1 block text-[10px] text-[hsl(var(--muted-foreground))]">{item === 'Short' ? '8 oz' : item === 'Regular' ? '12 oz' : '16 oz'}</span></button>)}</div></div><div className="mt-6"><div className="eyebrow mb-3">Milk</div><div className="flex flex-wrap gap-2">{['Whole milk', 'Oat milk', 'Almond milk'].map((item) => <button data-testid={`button-milk-${item.split(' ')[0].toLowerCase()}`} key={item} onClick={() => setMilk(item)} className={`rounded-full border px-3 py-2 text-xs ${milk === item ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]' : 'border-[hsl(var(--border))]'}`}>{item}</button>)}</div></div><div className="mt-7 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5"><div className="flex items-center gap-3"><button data-testid="button-custom-minus" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Minus size={14} /></button><span className="mono w-4 text-center text-sm">{quantity}</span><button data-testid="button-custom-plus" onClick={() => setQuantity(quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Plus size={14} /></button></div><button data-testid="button-confirm-add" onClick={() => addToCart(customProduct, size, milk, quantity)} className="rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]">Add to order · {formatPrice(customProduct.price * quantity)}</button></div></div></div>}

      {cartOpen && <div className="fixed inset-0 z-50 flex justify-end bg-[#211710]/55 backdrop-blur-sm" onClick={() => setCartOpen(false)}><aside role="dialog" aria-modal="true" className="flex h-full w-full max-w-md flex-col bg-[hsl(var(--card))] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-6"><div><div className="eyebrow text-[hsl(var(--accent))]">Order ahead</div><h2 className="serif mt-1 text-3xl">{orderPlaced ? 'See you soon' : 'Your order'}</h2></div><button data-testid="button-close-cart" onClick={() => setCartOpen(false)}><X size={20} /></button></div>{orderPlaced ? <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--accent)/.18)] text-[hsl(var(--accent))]"><Check size={28} /></div><div className="eyebrow mt-7 text-[hsl(var(--accent))]">Order #{orderPlaced.id} is in the queue</div><h2 className="serif mt-3 text-4xl">Your coffee is on its way.</h2><p className="mt-4 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">Give our bar about {orderPlaced.prepMinutes} minutes. Your order should be ready around {new Date(orderPlaced.eta).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p><div className="mt-7 flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-3 text-xs"><Timer size={15} className="text-[hsl(var(--accent))]" /> Estimated prep time: {orderPlaced.prepMinutes} min</div><button data-testid="button-order-done" onClick={() => { setOrderPlaced(null); setCartOpen(false); }} className="mt-8 rounded-full bg-[hsl(var(--primary))] px-6 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]">Done</button></div> : cart.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><ShoppingBag size={26} className="mb-4 text-[hsl(var(--accent))]" /><p className="serif text-2xl">A little empty here.</p><p className="mt-2 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">Add something lovely from the menu and we will have it ready when you arrive.</p><button data-testid="button-cart-browse" onClick={() => { setCartOpen(false); scrollTo('menu'); }} className="mt-6 text-xs underline">Browse the menu</button></div> : <><div className="flex-1 overflow-y-auto p-6">{cart.map((item, index) => <div data-testid={`row-cart-item-${item.id}`} key={`${item.id}-${item.size}-${item.milk}`} className="flex gap-4 border-b border-[hsl(var(--border))] py-4 first:pt-0"><div className="w-20 shrink-0 overflow-hidden rounded-xl"><ProductArt art={item.art} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="serif text-lg leading-tight">{item.name}</h3><span className="mono text-xs">{formatPrice(item.price * item.quantity)}</span></div><p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{item.size} · {item.milk}</p><div className="mt-3 flex items-center gap-2"><button data-testid={`button-cart-minus-${item.id}`} onClick={() => updateCartItem(index, -1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Minus size={11} /></button><span className="mono w-4 text-center text-xs">{item.quantity}</span><button data-testid={`button-cart-plus-${item.id}`} onClick={() => updateCartItem(index, 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Plus size={11} /></button></div></div></div>)}</div><div className="border-t border-[hsl(var(--border))] p-6"><div className="mb-5 flex justify-between text-sm"><span className="text-[hsl(var(--muted-foreground))]">Subtotal</span><span className="mono">{formatPrice(cartTotal)}</span></div><button data-testid="button-checkout" disabled={orderSubmitting} onClick={placeOrder} className="w-full rounded-full bg-[hsl(var(--primary))] py-3.5 text-xs font-bold text-[hsl(var(--primary-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-wait disabled:opacity-60">{orderSubmitting ? 'Sending to the bar…' : `Place order · ${formatPrice(cartTotal)}`}</button><p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-[hsl(var(--muted-foreground))]"><Clock3 size={12} /> Ready in about 12–20 minutes · payment at the counter</p></div></>}</aside></div>}

      {bookingOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#211710]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setBookingOpen(false)}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-[1.5rem] bg-[hsl(var(--card))] p-6 sm:rounded-[1.5rem] sm:p-8" onClick={(event) => event.stopPropagation()}>{booked ? <div className="py-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent))]"><Check size={25} /></div><h2 className="serif mt-5 text-4xl">Table held.</h2><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">We will see you soon. A little confirmation is on its way to your inbox.</p><button data-testid="button-close-booking-success" onClick={() => { setBookingOpen(false); setBooked(false); }} className="mt-7 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))]">Done</button></div> : <><div className="flex items-start justify-between"><div><div className="eyebrow text-[hsl(var(--accent))]">Reserve a corner</div><h2 className="serif mt-2 text-3xl">Book a table.</h2></div><button data-testid="button-close-booking" onClick={() => setBookingOpen(false)}><X size={20} /></button></div><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">For groups of more than six, drop us a note at hello@brewandbean.au.</p><form onSubmit={submitBooking} className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-xs"><span className="mb-2 block text-[hsl(var(--muted-foreground))]">Your name</span><input data-testid="input-booking-name" name="name" required className="w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-3 outline-none focus:border-[hsl(var(--accent))]" placeholder="Name" /></label><label className="text-xs"><span className="mb-2 block text-[hsl(var(--muted-foreground))]">Email</span><input data-testid="input-booking-email" name="email" required type="email" className="w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-3 outline-none focus:border-[hsl(var(--accent))]" placeholder="you@email.com" /></label><label className="text-xs"><span className="mb-2 block text-[hsl(var(--muted-foreground))]">Date</span><input data-testid="input-booking-date" name="date" required type="date" className="w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-3 outline-none focus:border-[hsl(var(--accent))]" /></label><label className="text-xs"><span className="mb-2 block text-[hsl(var(--muted-foreground))]">Time</span><select data-testid="select-booking-time" name="time" className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-3 outline-none focus:border-[hsl(var(--accent))]"><option>8:30 am</option><option>10:00 am</option><option>12:30 pm</option><option>3:00 pm</option><option>5:30 pm</option></select></label><label className="text-xs sm:col-span-2"><span className="mb-2 block text-[hsl(var(--muted-foreground))]">Party size</span><div className="flex gap-2">{[2, 3, 4, 5, 6].map((number) => <button data-testid={`button-party-${number}`} type="button" key={number} onClick={() => setPartySize(number)} className={`flex-1 rounded-lg border py-3 text-sm transition ${partySize === number ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent))]'}`}>{number}</button>)}</div></label>{bookingError && <p className="text-xs text-[#b44c3c] sm:col-span-2">{bookingError}</p>}<button data-testid="button-submit-booking" disabled={bookingSubmitting} className="mt-2 rounded-full bg-[hsl(var(--primary))] py-3.5 text-xs font-bold text-[hsl(var(--primary-foreground))] sm:col-span-2 disabled:cursor-wait disabled:opacity-60">{bookingSubmitting ? 'Holding your table…' : <>Request this table for {partySize} <ArrowRight size={14} className="ml-2 inline" /></>}</button></form></>}</div></div>}
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
      <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
      <Route component={App} />
    </Switch>
  );
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <AppRoutes />
    </ClerkProvider>
  );
}

export default function RootApp() {
  return (
    <WouterRouter base={basePath}>
      <ClerkApp />
    </WouterRouter>
  );
}