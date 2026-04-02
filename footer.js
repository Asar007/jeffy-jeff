// NRI Bridge India — Shared Footer
// Injected into all pages via <script src="footer.js"></script>
(function() {
  var footerHTML = '' +
    '<div class="footer-top">' +
      '<div class="footer-brand">' +
        '<div class="nav-logo"><img src="NRI-BRIDGE-INDIA_LOGO-WHITE-PNG.png" alt="NRI Bridge India" style="height:80px;width:auto;display:block;"></div>' +
        '<p>End-to-end property, vehicle, family, and legal management for Non-Resident Indians. Managing your life in India so you can focus on your life abroad.</p>' +
      '</div>' +
      '<div class="footer-cols">' +
        '<div class="footer-col">' +
          '<h4>Services</h4>' +
          '<ul>' +
            '<li><a href="/home-management">Home Management</a></li>' +
            '<li><a href="/vehicle-management">Vehicle Management</a></li>' +
            '<li><a href="/parental-care">Parental Care</a></li>' +
            '<li><a href="/legal-documentation">Legal & Documentation</a></li>' +
            '<li><a href="/services">View All Services</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Company</h4>' +
          '<ul>' +
            '<li><a href="#">About Us</a></li>' +
            '<li><a href="#">Cities We Cover</a></li>' +
            '<li><a href="#">Blog</a></li>' +
            '<li><a href="#">Careers</a></li>' +
            '<li><a href="#">Contact</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-col">' +
          '<h4>Resources</h4>' +
          '<ul>' +
            '<li><a href="#">NRI Tax Guide</a></li>' +
            '<li><a href="#">RERA Compliance</a></li>' +
            '<li><a href="#">FAQs</a></li>' +
            '<li><a href="#">Privacy Policy</a></li>' +
            '<li><a href="#">Terms of Service</a></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">&copy; 2026 NRI Bridge India. All rights reserved. Registered in India.</div>';

  var footerEl = document.querySelector('footer');
  if (footerEl) {
    footerEl.innerHTML = footerHTML;
  }
})();
