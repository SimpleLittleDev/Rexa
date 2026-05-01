import { BuilderNode } from "@/types/builder";

export const mockBuilderTree: BuilderNode[] = [
  {
    id: "node-navbar",
    type: "Navbar",
    name: "Navbar",
    props: { logo: "BuilderX", links: ["Home", "Features", "Pricing", "Contact"] },
    styles: { padding: "16px 24px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" },
    responsiveStyles: {
      mobile: { padding: "12px 16px" },
    },
    responsiveVisibility: { desktop: true, laptop: true, tablet: true, mobile: true },
    children: [],
  },
  {
    id: "node-hero",
    type: "HeroSection",
    name: "Hero Section",
    props: { title: "Build visually, customize deeply", subtitle: "Create stunning websites with drag and drop plus real code power.", buttonText: "Get Started" },
    styles: { padding: "96px 24px", textAlign: "center", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    responsiveStyles: {
      tablet: { padding: "64px 24px" },
      mobile: { padding: "48px 16px" },
    },
    responsiveVisibility: { desktop: true, laptop: true, tablet: true, mobile: true },
    children: [
      {
        id: "node-hero-container",
        type: "Container",
        name: "Container",
        props: { maxWidth: "1200px" },
        styles: { maxWidth: "1200px", margin: "0 auto" },
        children: [
          {
            id: "node-hero-heading",
            type: "Heading",
            name: "Heading",
            props: { text: "Build visually, customize deeply", level: "h1" },
            styles: { fontSize: "56px", fontWeight: "800", color: "#ffffff", lineHeight: "1.1" },
            responsiveStyles: {
              tablet: { fontSize: "42px" },
              mobile: { fontSize: "32px" },
            },
            children: [],
          },
          {
            id: "node-hero-text",
            type: "Text",
            name: "Subtitle",
            props: { text: "Create stunning websites with drag and drop plus real code power." },
            styles: { fontSize: "20px", color: "rgba(255,255,255,0.9)", marginTop: "16px", maxWidth: "600px", margin: "16px auto 0" },
            responsiveStyles: {
              mobile: { fontSize: "16px" },
            },
            children: [],
          },
          {
            id: "node-hero-btngroup",
            type: "ButtonGroup",
            name: "Button Group",
            props: {},
            styles: { display: "flex", gap: "12px", justifyContent: "center", marginTop: "32px" },
            responsiveStyles: {
              mobile: { flexDirection: "column", alignItems: "stretch" },
            },
            children: [
              {
                id: "node-hero-btn1",
                type: "Button",
                name: "CTA Button",
                props: { text: "Get Started Free", variant: "primary" },
                styles: { padding: "14px 28px", borderRadius: "12px", backgroundColor: "#ffffff", color: "#6366f1", fontWeight: "600" },
                responsiveStyles: {
                  mobile: { width: "100%" },
                },
                children: [],
              },
              {
                id: "node-hero-btn2",
                type: "Button",
                name: "Secondary Button",
                props: { text: "Watch Demo", variant: "secondary" },
                styles: { padding: "14px 28px", borderRadius: "12px", backgroundColor: "transparent", color: "#ffffff", border: "2px solid rgba(255,255,255,0.5)" },
                responsiveStyles: {
                  mobile: { width: "100%" },
                },
                children: [],
              },
            ],
          },
          {
            id: "node-hero-card",
            type: "AnimatedCard",
            name: "Animated Card",
            componentId: "animated-card",
            props: { title: "Visual Builder", description: "Drag components onto canvas", icon: "layers" },
            styles: { marginTop: "48px", padding: "24px", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" },
            responsiveVisibility: { desktop: true, laptop: true, tablet: true, mobile: false },
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "node-features",
    type: "FeatureSection",
    name: "Feature Section",
    props: { title: "Everything you need", subtitle: "Powerful features for modern web development" },
    styles: { padding: "96px 24px", backgroundColor: "#f8fafc" },
    responsiveStyles: {
      mobile: { padding: "48px 16px" },
    },
    children: [
      {
        id: "node-features-grid",
        type: "Grid",
        name: "Feature Grid",
        props: { columns: 3 },
        styles: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "1200px", margin: "0 auto" },
        responsiveStyles: {
          tablet: { gridTemplateColumns: "repeat(2, 1fr)" },
          mobile: { gridTemplateColumns: "1fr", gap: "16px" },
        },
        children: [
          {
            id: "node-feature-1",
            type: "Card",
            name: "Feature Card 1",
            props: { title: "Visual Editing", description: "Drag and drop components with real-time preview", icon: "mouse-pointer" },
            styles: { padding: "32px", borderRadius: "16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" },
            children: [],
          },
          {
            id: "node-feature-2",
            type: "Card",
            name: "Feature Card 2",
            props: { title: "Custom Components", description: "Build and reuse your own React components", icon: "code" },
            styles: { padding: "32px", borderRadius: "16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" },
            children: [],
          },
          {
            id: "node-feature-3",
            type: "Card",
            name: "Feature Card 3",
            props: { title: "Responsive Design", description: "Per-breakpoint editing for all devices", icon: "smartphone" },
            styles: { padding: "32px", borderRadius: "16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" },
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "node-pricing",
    type: "PricingSection",
    name: "Pricing Section",
    props: { title: "Simple pricing" },
    styles: { padding: "96px 24px" },
    responsiveStyles: {
      mobile: { padding: "48px 16px" },
    },
    children: [
      {
        id: "node-pricing-card-1",
        type: "Card",
        name: "Pricing Card Free",
        props: { plan: "Free", price: "$0", features: ["5 pages", "10 components", "Basic export"] },
        styles: { padding: "32px", borderRadius: "16px", border: "1px solid #e2e8f0" },
        children: [],
      },
      {
        id: "node-pricing-card-2",
        type: "Card",
        name: "Pricing Card Pro",
        props: { plan: "Pro", price: "$29/mo", features: ["Unlimited pages", "Custom components", "Advanced animations", "Priority support"] },
        styles: { padding: "32px", borderRadius: "16px", border: "2px solid #6366f1", backgroundColor: "#f8f7ff" },
        children: [],
      },
      {
        id: "node-pricing-card-3",
        type: "Card",
        name: "Pricing Card Enterprise",
        props: { plan: "Enterprise", price: "Custom", features: ["Everything in Pro", "Custom integrations", "Dedicated support", "SLA"] },
        styles: { padding: "32px", borderRadius: "16px", border: "1px solid #e2e8f0" },
        children: [],
      },
    ],
  },
  {
    id: "node-footer",
    type: "Footer",
    name: "Footer",
    props: { copyright: "© 2024 BuilderX. All rights reserved." },
    styles: { padding: "48px 24px", backgroundColor: "#1e293b", color: "#94a3b8", textAlign: "center" },
    responsiveStyles: {
      mobile: { padding: "32px 16px" },
    },
    children: [],
  },
];
