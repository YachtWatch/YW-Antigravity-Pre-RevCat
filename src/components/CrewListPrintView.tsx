import { UserData, Vessel } from '../contexts/DataContext';

interface CrewListPrintViewProps {
    vessel: Vessel;
    crew: UserData[];
    captainName: string;
}

export function CrewListPrintView({ vessel, crew, captainName }: CrewListPrintViewProps) {
    const today = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="p-8 max-w-[210mm] mx-auto bg-white text-black print:p-[20mm] print:max-w-none">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-6 mb-8">
                <h1 className="text-3xl font-serif font-bold uppercase tracking-wider mb-2">Crew List</h1>
                <h2 className="text-xl font-medium mb-1">
                    {vessel.type === 'motor' ? 'M/Y' : 'S/Y'} {vessel.name}
                </h2>
                <p className="text-sm text-gray-500">Date: {today}</p>
            </div>

            {/* Table */}
            <table className="w-full text-left border-collapse mb-12">
                <thead>
                    <tr className="border-b border-black">
                        <th className="py-2 pr-4 font-bold uppercase text-xs">Full Name</th>
                        <th className="py-2 pr-4 font-bold uppercase text-xs">Position</th>
                        <th className="py-2 pr-4 font-bold uppercase text-xs">Date of Birth</th>
                        <th className="py-2 pr-4 font-bold uppercase text-xs">Nationality</th>
                        <th className="py-2 font-bold uppercase text-xs text-right">Passport No.</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {crew.map((member) => (
                        <tr key={member.id} className="border-b border-gray-200">
                            <td className="py-3 pr-4">{member.name}</td>
                            <td className="py-3 pr-4 font-medium">{member.customRole || member.role}</td>
                            <td className="py-3 pr-4">{member.dateOfBirth || '-'}</td>
                            <td className="py-3 pr-4">{member.nationality || '-'}</td>
                            <td className="py-3 text-right font-mono">{member.passportNumber || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer / Signature */}
            <div className="mt-20 break-inside-avoid">
                <div className="flex justify-between items-end">
                    <div className="text-left">
                        <div className="mb-4 text-xs font-bold uppercase tracking-wider">Signed:</div>
                        <div className="h-10 border-b border-black w-64 mb-2"></div>
                        <div className="text-sm font-bold">({captainName})</div>
                        <div className="text-xs">Captain of {vessel.type === 'motor' ? 'M/Y' : 'S/Y'} {vessel.name}</div>
                    </div>
                    <div className="w-32 h-32 border-2 border-gray-300 rounded-full flex items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest rotate-[-15deg]">
                        Ship's Stamp
                    </div>
                </div>
            </div>

            <style>
                {`
                    @media print {
                        @page { margin: 0; }
                        body { 
                            -webkit-print-color-adjust: exact; 
                        }
                    }
                `}
            </style>
        </div>
    );
}
