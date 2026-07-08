import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="mx-auto max-w-[1500px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              Tech<span className="text-brand-400">Store</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
              Real tech, fair prices, fast delivery across India. Demo storefront —
              not a real shop.
            </p>
          </div>
          <FooterCol
            title="Shop"
            links={[
              ["All products", "/products"],
              ["Smartphones", "/products?category=smartphones"],
              ["Laptops", "/products?category=laptops"],
              ["Audio", "/products?category=audio"],
              ["Stores", "/stores"],
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              ["Your account", "/account"],
              ["Your orders", "/account/orders"],
              ["Wishlist", "/wishlist"],
              ["Cart", "/cart"],
            ]}
          />
          <FooterCol
            title="Business"
            links={[
              ["Become a wholesaler", "/become-a-wholesaler"],
              ["Sell on TechStore", "/vendor/apply"],
              ["Contact", "#"],
              ["Privacy", "#"],
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/30 sm:flex-row">
          <span>© 2026 TechStore · Built with Next.js</span>
          <a href="#top" className="transition hover:text-white">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm text-white/50">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
