# IPv6 Address Calculator

IPv6 address calculator with BigInt arithmetic, address type detection, prefix breakdown and IPv4-to-IPv6 mapping. Everything runs client-side -- no data is sent to any server.

**[Live Demo](https://gmowses.github.io/ipv6-calculator)**

## Features

- **Prefix calculation** -- network, first/last address, total addresses using BigInt for 128-bit precision
- **Address expansion/compression** -- full :: handling per RFC 5952
- **Address type detection** -- link-local, ULA, multicast, global unicast, loopback, documentation, 6to4, IPv4-mapped
- **Prefix breakdown** -- visual hierarchy of global format, routing prefix, site, subnet
- **Visual prefix highlighting** -- expanded address with network/host parts color-coded
- **IPv4 to IPv6 mapping** -- convert IPv4 to ::ffff:x.x.x.x representation
- **Copy to clipboard** -- one-click copy for any calculated value
- **Dark / Light mode** -- toggle or auto-detect from system preference
- **i18n** -- English and Portuguese (auto-detect)
- **Zero backend** -- pure client-side, works offline

## Tech Stack

- React 19, TypeScript, Tailwind CSS v4, Vite, Lucide icons

## Getting Started

```bash
git clone https://github.com/gmowses/ipv6-calculator.git
cd ipv6-calculator
npm install
npm run dev
```

## License

[MIT](LICENSE) -- Gabriel Mowses
