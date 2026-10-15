# Design System - Quadra

## Colors

### Primary Palette
- **Primary**: `#1B2A4A` - Dark navy blue for main UI elements
- **Accent**: `#D4AF37` - Gold for highlights, buttons, and emphasis
- **Success**: `#27AE60` - Green for success states and positive messages
- **Error**: `#E74C3C` - Red for error states and warnings

### Neutral
- **Border**: `#DDD` - Light gray for borders and dividers
- **Background Light**: `#F9F9F9` - Very light gray for subtle backgrounds
- **White**: `#FFFFFF` - Pure white for main backgrounds
- **Text Dark**: `#333` - Dark gray for body text

## Typography

### Font Family
- **Primary Font**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif
- **Display Font**: 'Playfair Display', serif (used for headings/titles)

### Font Sizes & Weights
- **H1 (Title)**: 48px, weight 700, letter-spacing 3px
- **H2 (Card Heading)**: 24px, weight 700
- **Body**: 14px, weight 400
- **Label**: 13px, weight 600, uppercase, letter-spacing 0.3px
- **Small/Meta**: 12px, weight 400
- **Tagline**: 14px, weight 500, uppercase, letter-spacing 1px

## Components

### Buttons
- **Primary Button**: 
  - Background: linear-gradient(135deg, #1B2A4A 0%, #0f1620 100%)
  - Color: white
  - Padding: 12px 24px
  - Border radius: 4px
  - Hover: translateY(-2px), shadow 0 8px 20px rgba(27, 42, 74, 0.4)
  
- **Secondary Button**:
  - Background: #D4AF37
  - Color: #1B2A4A
  - Border radius: 4px
  - Padding: 10px 20px

- **Tab Button**:
  - Padding: 12px 16px
  - Border radius: 8px
  - Active: Background #D4AF37, color white
  
### Cards & Containers
- **Login Card**:
  - Background: rgba(255, 255, 255, 0.98) with backdrop-filter blur(8px)
  - Border radius: 20px
  - Padding: 50px 40px
  - Border: 1px solid rgba(212, 175, 55, 0.3)
  - Box shadow: 0 20px 60px rgba(0, 0, 0, 0.15)

- **Regular Card**:
  - Background: white
  - Border radius: 8px
  - Padding: 30px
  - Box shadow: 0 4px 12px rgba(0,0,0,0.1)

### Forms
- **Input**:
  - Padding: 13px 15px
  - Border: 2px solid rgba(27, 42, 74, 0.1)
  - Border radius: 8px
  - Font size: 14px
  - Focus: Border #D4AF37, background white, shadow 0 0 0 3px rgba(212, 175, 55, 0.15)

### Navigation
- **Navbar**:
  - Background: #1B2A4A
  - Padding: 15px 30px
  - Box shadow: 0 2px 8px rgba(0,0,0,0.2)
  - H1: 28px, weight 700, letter-spacing 2px, color #D4AF37

## Spacing Scale
- Extra small: 8px
- Small: 15px
- Medium: 20px
- Large: 30px
- Extra large: 50px

## Border Radius
- Small elements: 4px
- Form elements: 8px
- Cards: 8px
- Login card: 20px
- Pills: 10px

## Shadow System
- **Small**: 0 2px 8px rgba(0,0,0,0.2)
- **Medium**: 0 4px 12px rgba(0,0,0,0.1)
- **Large**: 0 20px 60px rgba(0, 0, 0, 0.15)
- **Accent glow**: 0 0 50px rgba(212, 175, 55, 0.1)

## Animations
- **Standard duration**: 0.3s
- **Form focus**: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)
- **Login slide up**: 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)
- **Button hover lift**: translateY(-2px), 150ms
- **Button press**: scale .96, 160ms

## Key Design Principles
1. **Elegant minimalism** - Clean, uncluttered interfaces with purposeful spacing
2. **Premium feel** - Gold accents and refined typography suggest sophistication
3. **Dark mode ready** - Color palette works well with dark backgrounds
4. **Accessible** - High contrast ratios, clear hierarchy, readable typography
5. **Professional** - Suitable for financial/accounting applications
