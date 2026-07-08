import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 text-white">
      {/* Back to top */}
      <a
        href="#top"
        className="block bg-amz-navy3 py-4 text-center text-sm hover:bg-[#485769]"
      >
        Back to top
      </a>

      {/* Link columns */}
      <div className="bg-amz-footer">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <FooterCol
            title="Get to Know Us"
            links={[
              ["About TechStore", "#"],
              ["Careers", "#"],
              ["Press Releases", "#"],
              ["TechStore Cares", "#"],
            ]}
          />
          <FooterCol
            title="Shop With Us"
            links={[
              ["All products", "/products"],
              ["Smartphones", "/products?category=smartphones"],
              ["Laptops", "/products?category=laptops"],
              ["Audio", "/products?category=audio"],
            ]}
          />
          <FooterCol
            title="Let Us Help You"
            links={[
              ["Your Account", "/account"],
              ["Your Orders", "/account/orders"],
              ["Shipping & Delivery", "#"],
              ["Returns & Replacements", "#"],
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              ["Track order", "/account/orders"],
              ["Contact us", "#"],
              ["Privacy policy", "#"],
              ["Terms", "#"],
            ]}
          />
        </div>
      </div>

      {/* Logo divider */}
      <div className="border-t border-white/15 bg-amz-footer py-6 text-center">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          Tech<span className="text-amz-orange">Store</span>
          <span className="text-amz-orange">.in</span>
        </Link>
      </div>

      {/* Bottom bar */}
      <div className="bg-amz-footerdark py-6 text-center text-xs text-white/50">
        © {2026} TechStore.in · Built with Next.js · Demo storefront — not a real shop.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h4 className="text-base font-bold text-white">{title}</h4>
      <ul className="mt-3 space-y-2.5 text-sm text-white/70">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition hover:text-white hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
