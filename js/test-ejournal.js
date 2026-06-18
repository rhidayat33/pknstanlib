// Auto-test: inject sample data and render
// Include this script in ejournal.html temporarily for testing
(function() {
  window._testData = {
    journals: [
      {title:"Accounting Research Journal", metricType:"Total_Item_Requests", total:106, monthly:{"Jan-2023":1,"Feb-2023":0,"Mar-2023":2,"Apr-2023":3,"May-2023":2,"Jun-2023":0,"Jul-2023":10,"Aug-2023":0,"Sep-2023":7,"Oct-2023":3,"Nov-2023":4,"Dec-2023":4,"Jan-2024":0,"Feb-2024":0,"Mar-2024":1,"Apr-2024":0,"May-2024":4,"Jun-2024":2,"Jul-2024":7,"Aug-2024":0,"Sep-2024":1,"Oct-2024":6,"Nov-2024":24,"Dec-2024":25}},
      {title:"Accounting Research Journal", metricType:"Unique_Item_Requests", total:69, monthly:{"Jan-2023":1,"Feb-2023":0,"Mar-2023":1,"Apr-2023":2,"May-2023":1,"Jun-2023":0,"Jul-2023":6,"Aug-2023":0,"Sep-2023":3,"Oct-2023":2,"Nov-2023":3,"Dec-2023":3,"Jan-2024":0,"Feb-2024":0,"Mar-2024":1,"Apr-2024":0,"May-2024":2,"Jun-2024":1,"Jul-2024":5,"Aug-2024":0,"Sep-2024":1,"Oct-2024":3,"Nov-2024":16,"Dec-2024":18}},
      {title:"Accounting Auditing Journal", metricType:"Total_Item_Requests", total:204, monthly:{"Jan-2023":9,"Feb-2023":1,"Mar-2023":0,"Apr-2023":5,"May-2023":3,"Jun-2023":5,"Jul-2023":7,"Aug-2023":8,"Sep-2023":23,"Oct-2023":15,"Nov-2023":11,"Dec-2023":8,"Jan-2024":5,"Feb-2024":3,"Mar-2024":9,"Apr-2024":7,"May-2024":5,"Jun-2024":0,"Jul-2024":28,"Aug-2024":2,"Sep-2024":9,"Oct-2024":1,"Nov-2024":33,"Dec-2024":7}},
      {title:"Accounting Auditing Journal", metricType:"Unique_Item_Requests", total:134, monthly:{"Jan-2023":9,"Feb-2023":1,"Mar-2023":0,"Apr-2023":4,"May-2023":2,"Jun-2023":3,"Jul-2023":3,"Aug-2023":5,"Sep-2023":12,"Oct-2023":10,"Nov-2023":7,"Dec-2023":8,"Jan-2024":2,"Feb-2024":2,"Mar-2024":5,"Apr-2024":6,"May-2024":4,"Jun-2024":0,"Jul-2024":18,"Aug-2024":1,"Sep-2024":6,"Oct-2024":1,"Nov-2024":20,"Dec-2024":5}},
      {title:"Corporate Governance", metricType:"Total_Item_Requests", total:194, monthly:{"Jan-2023":2,"Feb-2023":0,"Mar-2023":2,"Apr-2023":0,"May-2023":2,"Jun-2023":1,"Jul-2023":9,"Aug-2023":1,"Sep-2023":7,"Oct-2023":16,"Nov-2023":15,"Dec-2023":2,"Jan-2024":3,"Feb-2024":2,"Mar-2024":2,"Apr-2024":2,"May-2024":13,"Jun-2024":19,"Jul-2024":8,"Aug-2024":0,"Sep-2024":3,"Oct-2024":30,"Nov-2024":35,"Dec-2024":20}},
      {title:"Corporate Governance", metricType:"Unique_Item_Requests", total:115, monthly:{"Jan-2023":2,"Feb-2023":0,"Mar-2023":1,"Apr-2023":0,"May-2023":1,"Jun-2023":1,"Jul-2023":5,"Aug-2023":1,"Sep-2023":5,"Oct-2023":8,"Nov-2023":9,"Dec-2023":2,"Jan-2024":2,"Feb-2024":1,"Mar-2024":1,"Apr-2024":2,"May-2024":8,"Jun-2024":12,"Jul-2024":7,"Aug-2024":0,"Sep-2024":2,"Oct-2024":14,"Nov-2024":20,"Dec-2024":11}},
      {title:"Engineering Construction Management", metricType:"Total_Item_Requests", total:135, monthly:{"Jan-2023":7,"Feb-2023":8,"Mar-2023":6,"Apr-2023":2,"May-2023":0,"Jun-2023":0,"Jul-2023":5,"Aug-2023":0,"Sep-2023":6,"Oct-2023":9,"Nov-2023":8,"Dec-2023":8,"Jan-2024":2,"Feb-2024":0,"Mar-2024":0,"Apr-2024":0,"May-2024":0,"Jun-2024":1,"Jul-2024":65,"Aug-2024":0,"Sep-2024":4,"Oct-2024":0,"Nov-2024":2,"Dec-2024":2}},
      {title:"Asian Review of Accounting", metricType:"Total_Item_Requests", total:98, monthly:{"Jan-2023":1,"Feb-2023":0,"Mar-2023":2,"Apr-2023":2,"May-2023":4,"Jun-2023":0,"Jul-2023":1,"Aug-2023":1,"Sep-2023":4,"Oct-2023":9,"Nov-2023":6,"Dec-2023":11,"Jan-2024":8,"Feb-2024":0,"Mar-2024":0,"Apr-2024":0,"May-2024":3,"Jun-2024":1,"Jul-2024":4,"Aug-2024":2,"Sep-2024":0,"Oct-2024":13,"Nov-2024":26,"Dec-2024":0}},
      {title:"Built Environment Project", metricType:"Total_Item_Requests", total:96, monthly:{"Jan-2023":4,"Feb-2023":0,"Mar-2023":8,"Apr-2023":1,"May-2023":0,"Jun-2023":0,"Jul-2023":1,"Aug-2023":0,"Sep-2023":2,"Oct-2023":2,"Nov-2023":4,"Dec-2023":2,"Jan-2024":10,"Feb-2024":0,"Mar-2024":0,"Apr-2024":0,"May-2024":0,"Jun-2024":2,"Jul-2024":54,"Aug-2024":0,"Sep-2024":0,"Oct-2024":0,"Nov-2024":6,"Dec-2024":0}}
    ],
    monthColumns: ["Jan-2023","Feb-2023","Mar-2023","Apr-2023","May-2023","Jun-2023","Jul-2023","Aug-2023","Sep-2023","Oct-2023","Nov-2023","Dec-2023","Jan-2024","Feb-2024","Mar-2024","Apr-2024","May-2024","Jun-2024","Jul-2024","Aug-2024","Sep-2024","Oct-2024","Nov-2024","Dec-2024"],
    metricTypes: ["Total_Item_Requests", "Unique_Item_Requests"],
    totalJournals: 9
  };

  // Wait for DOM and Chart.js to load, then inject
  setTimeout(function() {
    console.log('[TEST] Injecting test data...');
    ejournalData = window._testData;
    ejournalData.metricTypes = window._testData.metricTypes;
    populateFilters();
    renderAll();
    console.log('[TEST] ✅ Data injected and rendered');
    console.log('[TEST] filter-metric:', document.getElementById('filter-metric').value);
    console.log('[TEST] filter-year:', document.getElementById('filter-year').value);
    console.log('[TEST] filtered journals:', getFilteredJournals().length);
    console.log('[TEST] filtered months:', getFilteredMonths().length, getFilteredMonths());
    console.log('[TEST] ejCharts keys:', Object.keys(ejCharts));

    const canvasIds = ['chart-ej-monthly', 'chart-ej-top', 'chart-ej-metrics'];
    canvasIds.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        console.log(`[INSPECT] ${id} - clientWidth: ${canvas.clientWidth}, clientHeight: ${canvas.clientHeight}`);
        console.log(`[INSPECT] ${id} - boundingClientRect:`, JSON.stringify(canvas.getBoundingClientRect()));
        if (typeof Chart !== 'undefined') {
          const chart = Chart.getChart(id);
          if (chart) {
            console.log(`[INSPECT] ${id} - Chart object exists: ctx: ${!!chart.ctx}, width: ${chart.width}, height: ${chart.height}`);
            console.log(`[INSPECT] ${id} - Chart data:`, JSON.stringify(chart.data));
          } else {
            console.log(`[INSPECT] ${id} - No Chart object found`);
          }
        }
      } else {
        console.log(`[INSPECT] ${id} - Canvas not found`);
      }
    });
  }, 2000);
})();
