export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1C1C1E] border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-400 text-center">
          Ballotbox &middot; Nonpartisan voter information &middot; Data from Google Civic Information API
        </p>
        <p className="mt-2 text-xs text-gray-600 text-center">
          &copy; {year} Ballotbox. All information is provided for reference only and is not a substitute for official
          government sources. This tool is strictly nonpartisan.
        </p>
      </div>
    </footer>
  );
}
