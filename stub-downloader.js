const baseUrl = window.location.origin;
console.log('=== WagePoint Paystub Downloader v8 - Reliable Blob + Date Names ===');

const getStubsWithLinks = async () => {
	const payrollHistoryDiv = document.querySelector('div.payroll-history');
	if (!payrollHistoryDiv) return console.error('❌ No payroll-history');
	const children = Array.from(payrollHistoryDiv.children);
	const payrollTable = children.findLast(c => c.classList.contains('table-body'));
	if (!payrollTable) return console.error('❌ No table-body');
	const inputs = Array.from(payrollTable.querySelectorAll('input'));
	const results = [];

	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i];
		const onclick = input.getAttribute('onclick');
		const id = onclick ? onclick.replace(/\D/g, '') : null;
		if (!id) continue;

		const rowText = input.closest('tr')?.textContent || '';
		let date = rowText.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{2}-\d{2})/) ? RegExp.$1 || RegExp.$2 : 'unknown';
		if (date.includes('/')) {
			const [m, d, y] = date.split('/').map(Number);
			date = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
		}

		try {
			const formData = new URLSearchParams({method: 'getPayStub', id});
			const res = await fetch(`${baseUrl}/cfcs/realtime.cfc`, {
				method: 'POST',
				headers: {'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'},
				credentials: 'same-origin',
				body: formData.toString()
			});
			const data = await res.json();
			if (data?.PDF) {
				const url = `https://secure.wagepoint.com/${data.PDF}`;
				results.push({date, url});
				console.log(`✅ ${date} → ${url}`);
			}
		} catch(e) {}
		if (i % 8 === 0) await new Promise(r => setTimeout(r, 300));
	}
	return results;
};

getStubsWithLinks().then(async results => {
	if (!results.length) return console.error('No results');

	// CSV
	let csv = "Pay Date,PDF URL\n";
	results.forEach(r => csv += `"${r.date}","${r.url}"\n`);
	const csvBlob = new Blob([csv], {type: 'text/csv'});
	const csvA = document.createElement('a');
	csvA.href = URL.createObjectURL(csvBlob);
	csvA.download = `wagepoint-paystubs-${new Date().toISOString().slice(0,10)}.csv`;
	csvA.click();
	URL.revokeObjectURL(csvA.href);
	console.log('✅ CSV downloaded');

	// PDFs
	console.log(`🚀 Downloading ${results.length} PDFs...`);
	for (let i = 0; i < results.length; i++) {
		const {date, url} = results[i];
		try {
			const res = await fetch(url, {credentials: 'same-origin'});
			const blob = await res.blob();
			if (blob.size < 20000) throw new Error('Not PDF');
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `paystub-${date}.pdf`;
			a.click();
			URL.revokeObjectURL(a.href);
			console.log(`✅ Saved paystub-${date}.pdf`);
		} catch(e) { console.error(`❌ ${date}`, e); }
		await new Promise(r => setTimeout(r, 900));
	}
	console.log('✅ All done!');
});
