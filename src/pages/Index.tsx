import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Bike, Package, UtensilsCrossed, ShoppingCart, Home, MapPin, ChevronRight, Star, Menu, X, Apple, Play, ArrowRight, Phone, Mail, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchWebsiteHome, fetchMobileAppRelease } from "@/lib/api";

const services = [
  { icon: Bike, title: "Ride Sharing", desc: "Book bikes, cars, autos instantly. Fixed fare or bargain.", color: "from-violet to-violet-light" },
  { icon: Package, title: "Parcel Delivery", desc: "Send anything across the city — same day.", color: "from-amber to-amber-light" },
  { icon: UtensilsCrossed, title: "Food Delivery", desc: "Order from local restaurants with live tracking.", color: "from-rose to-rose-light" },
  { icon: ShoppingCart, title: "Online Shopping", desc: "Shop local vendors, delivered to your door.", color: "from-emerald to-emerald-light" },
  { icon: Home, title: "Room Finder", desc: "Verified rooms, flats, PGs across the city.", color: "from-sky to-sky" },
  { icon: MapPin, title: "Tour & Outstation", desc: "Book a full-day hire or multi-city trip.", color: "from-amber to-amber-light" },
];

const features = [
  { title: "Female-Safe Rides", desc: "Female drivers for female passengers, verified.", align: "left" },
  { title: "In-App Chat & Call", desc: "No phone number exposure, ever.", align: "right" },
  { title: "Bargain Mode", desc: "Name your price. Riders bid. You choose.", align: "left" },
  { title: "Coin Rewards", desc: "Earn coins every ride. Redeem on future bookings.", align: "right" },
  { title: "Loyalty Tiers", desc: "Bronze to Diamond — the more you ride, the more you save.", align: "left" },
  { title: "Scheduled Rides", desc: "Book tomorrow's 7 AM ride, tonight.", align: "right" },
];

const testimonials = [
  { name: "Aarav Sharma", role: "Daily Commuter", quote: "Pugau has completely changed my daily commute. The bargain feature saves me money every day!", rating: 5 },
  { name: "Priya Thapa", role: "Restaurant Owner", quote: "Listed my restaurant on Pugau and orders have been steadily increasing. Great platform!", rating: 5 },
  { name: "Bikash Rai", role: "Rider Partner", quote: "Earning with Pugau is flexible and fair. The bonus system keeps me motivated.", rating: 5 },
  { name: "Sunita Gurung", role: "Room Seeker", quote: "Found my perfect flat through Pugau in just 2 days. Verified listings are a game changer.", rating: 4 },
  { name: "Rajesh Poudel", role: "Parcel Sender", quote: "Same-day parcel delivery at affordable prices. My go-to for sending packages across the city.", rating: 5 },
];

/** Optional CMS via `AppSetting` JSON keys (see server `website_home_summary` → `marketing`). */
function parseMarketingServices(raw: unknown): typeof services | null {
  if (!Array.isArray(raw)) return null;
  const iconMap: Record<string, typeof Bike> = {
    bike: Bike,
    ride: Bike,
    package: Package,
    parcel: Package,
    utensils: UtensilsCrossed,
    food: UtensilsCrossed,
    cart: ShoppingCart,
    shop: ShoppingCart,
    home: Home,
    room: Home,
    mappin: MapPin,
    map: MapPin,
    tour: MapPin,
  };
  const out: typeof services = [] as typeof services;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, string>;
    if (!o.title || !o.desc) continue;
    const Icon = iconMap[(o.icon || "bike").toLowerCase()] || Bike;
    out.push({
      icon: Icon,
      title: o.title,
      desc: o.desc,
      color: o.color || "from-violet to-violet-light",
    });
  }
  return out.length ? out : null;
}

function parseMarketingFeatures(raw: unknown): typeof features | null {
  if (!Array.isArray(raw)) return null;
  const out: typeof features = [] as typeof features;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, string>;
    if (!o.title || !o.desc) continue;
    const align = o.align === "right" ? "right" : "left";
    out.push({ title: o.title, desc: o.desc, align });
  }
  return out.length ? out : null;
}

function parseMarketingTestimonials(raw: unknown): typeof testimonials | null {
  if (!Array.isArray(raw)) return null;
  const out: typeof testimonials = [] as typeof testimonials;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, string | number>;
    if (!o.name || !o.quote) continue;
    const rating = typeof o.rating === "number" ? Math.min(5, Math.max(1, Math.round(o.rating))) : 5;
    out.push({
      name: String(o.name),
      role: String(o.role || "Customer"),
      quote: String(o.quote),
      rating,
    });
  }
  return out.length ? out : null;
}

const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: homeData } = useQuery({
    queryKey: ["website-home"],
    queryFn: fetchWebsiteHome,
  });
  const { data: mobileApp } = useQuery({
    queryKey: ["website-mobile-app"],
    queryFn: fetchMobileAppRelease,
    staleTime: 60_000,
  });

  const marketing = homeData?.marketing as
    | { services?: unknown; features?: unknown; testimonials?: unknown }
    | undefined;
  const displayServices = parseMarketingServices(marketing?.services) ?? services;
  const displayFeatures = parseMarketingFeatures(marketing?.features) ?? features;
  const displayTestimonials = parseMarketingTestimonials(marketing?.testimonials) ?? testimonials;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const androidApkUrl = mobileApp?.android_file_url ?? null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled ? "bg-card/90 backdrop-blur-lg shadow-sm border-b" : "bg-transparent"
      )}>
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-xl font-bold">Pugau</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["Home", "Features", "Services", "How It Works", "Download"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{l}</a>
            ))}
            {mobileApp?.android_file_url ? (
              <a
                href={mobileApp.android_file_url}
                className="text-sm font-semibold text-primary hover:underline"
                download
              >
                Download Android app
              </a>
            ) : (
              <span className="text-sm font-medium text-muted-foreground/70 cursor-default" title="APK not published yet">
                Download Android app
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/admin/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            {androidApkUrl ? (
              <Button size="sm" className="gradient-primary border-0 gap-1.5" asChild>
                <a href={androidApkUrl} download>
                  Get App <Download className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button size="sm" className="gradient-primary border-0 gap-1.5" asChild>
                <a href="#download">
                  Get App <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-card border-b p-4 space-y-3">
            {["Home", "Features", "Services", "How It Works", "Download"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="block text-sm py-2" onClick={() => setMenuOpen(false)}>{l}</a>
            ))}
            {mobileApp?.android_file_url ? (
              <a
                href={mobileApp.android_file_url}
                className="block text-sm font-semibold text-primary py-2"
                download
                onClick={() => setMenuOpen(false)}
              >
                Download Android app
              </a>
            ) : (
              <span className="block text-sm text-muted-foreground py-2">Download Android app (soon)</span>
            )}
            <Link to="/admin/login"><Button variant="outline" className="w-full">Login</Button></Link>
            {androidApkUrl ? (
              <Button className="w-full gradient-primary border-0 gap-2" asChild>
                <a href={androidApkUrl} download onClick={() => setMenuOpen(false)}>
                  <Download className="h-4 w-4" /> Download Android app
                </a>
              </Button>
            ) : (
              <Button className="w-full gradient-primary border-0" asChild>
                <a href="#download" onClick={() => setMenuOpen(false)}>Get App</a>
              </Button>
            )}
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <section id="home" className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-[1.1]">
                Everything you need — rides, parcels, food, rooms, all in one app.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground text-pretty max-w-lg">
                Book a ride in seconds. Send parcels. Order food. Find a room. It's all Pugau.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" variant="outline" className="gap-2 rounded-full px-6 opacity-80" disabled>
                  <Apple className="h-5 w-5" /> App Store <span className="text-xs font-normal text-muted-foreground">(soon)</span>
                </Button>
                {androidApkUrl ? (
                  <Button size="lg" className="gradient-primary border-0 gap-2 rounded-full px-6 shadow-lg" asChild>
                    <a href={androidApkUrl} download>
                      <Download className="h-5 w-5" /> Download for Android
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="gap-2 rounded-full px-6" asChild>
                    <a href="#download">
                      <Play className="h-5 w-5" /> Android <span className="text-xs font-normal text-muted-foreground">(see below)</span>
                    </a>
                  </Button>
                )}
              </div>
              <div className="mt-10 flex gap-8">
                {[
                  { v: homeData?.active_riders != null ? `${homeData.active_riders.toLocaleString()}+` : "10,000+", l: "Active Riders" },
                  { v: homeData?.vehicle_types?.length != null ? `${homeData.vehicle_types.length}` : "6+", l: "Vehicle Types" },
                  { v: homeData?.promos?.length != null ? `${homeData.promos.length}+` : "50+", l: "Active Promos" },
                ].map(s => (
                  <div key={s.l}>
                    <p className="text-2xl font-bold">{s.v}</p>
                    <p className="text-xs text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative hidden md:block"
            >
              <div className="relative mx-auto w-64 h-[500px] rounded-[3rem] border-4 border-foreground/10 bg-muted shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground/10 rounded-b-2xl" />
                <div className="p-4 pt-10 space-y-4">
                  <div className="h-4 w-20 bg-foreground/10 rounded" />
                  <div className="h-28 bg-primary/10 rounded-2xl" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-foreground/5 rounded-xl" />)}
                  </div>
                  <div className="h-20 bg-emerald/10 rounded-2xl" />
                  <div className="h-16 bg-amber/10 rounded-2xl" />
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-balance">One App. Six Services.</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">Everything your city needs, in a single tap.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayServices.map((s, i) => (
              <motion.div
                key={`${s.title}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group rounded-2xl border bg-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              >
                <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4", s.color)}>
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all gap-1">
                  Learn More <ChevronRight className="h-4 w-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Open the App", desc: "Search by service — ride, parcel, food, or room." },
              { step: "2", title: "Book Instantly", desc: "Confirm with OTP or one tap. Choose your price." },
              { step: "3", title: "Track in Real Time", desc: "Chat, call, and tip — all from the app." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="mx-auto h-14 w-14 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div {...fadeUp} className="rounded-2xl gradient-primary p-8 md:p-10">
              <h3 className="text-2xl font-bold text-primary-foreground">Earn with Pugau</h3>
              <p className="mt-2 text-primary-foreground/80">Join as a rider or vendor partner. Set your own schedule, earn on your terms.</p>
              <Button variant="secondary" className="mt-6 rounded-full">Become a Partner</Button>
            </motion.div>
            <motion.div {...fadeUp} className="rounded-2xl bg-emerald p-8 md:p-10">
              <h3 className="text-2xl font-bold text-primary-foreground">List Your Room</h3>
              <p className="mt-2 text-primary-foreground/80">Reach thousands of room seekers. List free, earn from connections.</p>
              <Button variant="secondary" className="mt-6 rounded-full">List Now</Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Built for Nepal</h2>
            <p className="mt-3 text-muted-foreground">Features designed for the way you live.</p>
          </motion.div>
          <div className="space-y-6 max-w-4xl mx-auto">
            {displayFeatures.map((f, i) => (
              <motion.div
                key={`${f.title}-${i}`}
                initial={{ opacity: 0, x: f.align === "left" ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn("flex items-center gap-6", f.align === "right" && "flex-row-reverse")}
              >
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-primary/30" />
                </div>
                <div className={f.align === "right" ? "text-right" : ""}>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">What People Say</h2>
          </motion.div>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin snap-x">
            {displayTestimonials.map((t, i) => (
              <motion.div
                key={`${t.name}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="min-w-[280px] rounded-2xl border bg-card p-6 snap-start"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }, (_, j) => <Star key={j} className="h-4 w-4 fill-amber text-amber" />)}
                </div>
                <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="rounded-3xl gradient-hero p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Download Pugau — Free</h2>
            <p className="mt-3 text-primary-foreground/70 max-w-md mx-auto">
              {androidApkUrl
                ? "Get the Android app (APK) directly. Install and start riding, sending, and ordering today."
                : "Android and iOS apps are on the way. Check back soon for download links."}
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button size="lg" variant="secondary" className="rounded-full gap-2 opacity-90" disabled>
                <Apple className="h-5 w-5" /> App Store <span className="text-xs font-normal opacity-80">(soon)</span>
              </Button>
              {androidApkUrl ? (
                <Button size="lg" variant="secondary" className="rounded-full gap-2 font-semibold shadow-md border-2 border-primary-foreground/20" asChild>
                  <a href={androidApkUrl} download>
                    <Download className="h-5 w-5" /> Download Android app (APK)
                  </a>
                </Button>
              ) : (
                <Button size="lg" variant="secondary" className="rounded-full gap-2 opacity-75" disabled>
                  <Play className="h-5 w-5" /> Android APK <span className="text-xs font-normal">(soon)</span>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">P</span>
                </div>
                <span className="text-xl font-bold">Pugau</span>
              </div>
              <p className="text-sm text-muted-foreground">Your city's everything app. Rides, parcels, food, rooms — all in one place.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Ride Sharing", "Parcel Delivery", "Food Delivery", "Online Shopping", "Room Finder", "Tour Booking"].map(s => (
                  <li key={s} className="hover:text-foreground cursor-pointer transition-colors">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["About", "Blog", "Careers", "Press", "Contact"].map(s => (
                  <li key={s} className="hover:text-foreground cursor-pointer transition-colors">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> +977 98XXXXXXXX</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@pugau.com</div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <span>© 2026 Pugau. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
