var headerElement = document.getElementsByTagName('header')[0];
var asideElement = document.getElementsByTagName('aside')[0];

var menuButton = document.createElement('div');
menuButton.className = 'menu';
menuButton.onclick = function() {
  if (asideElement.style.display === 'block') {
    asideElement.style.display = 'none';
  } else {
    asideElement.style.display = 'block';
  }
};

var div = document.createElement('div');
menuButton.appendChild(div);
menuButton.appendChild(div.cloneNode());
menuButton.appendChild(div.cloneNode());

headerElement.appendChild(menuButton);