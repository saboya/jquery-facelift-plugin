/*!
 * Copyright (c) 2009 Rodrigo Saboya
 * Licensed under the MIT license.
 * http://github.com/saboya/jquery-facelift-plugin/tree/master
 * version 0.1a
 */
(function($){
	$.fn.facelift = function(options) {
		var opts = $.extend(defaults, options);
		return this.each(function() {			
			prepare(this);        
			_replace_tree(this,opts);
		});
	};

	var defaults = {
		useBackgroundMethod: false,
		inheritStyle: true,
		useExtendedStyles: false
	};

    function prepare(o) {
		if(o && o.hasChildNodes() && o.childNodes.length > 1) {
			for(var i in o.childNodes) {
				var node = o.childNodes[i];
				if(node && node.nodeType == 3) {
					var span = document.createElement('SPAN');
					span.style.margin = span.style.padding = span.style.border = '0px';
					span.className = 'flir-span';
					span.flirSpan = true;
					var txt = node.nodeValue.replace(/[\t\n\r]/g, ' ').replace(/\s\s+/g, ' ');
					if(jQuery.browser.msie) {
						span.innerHTML = node.nodeValue.replace(/^\s+|\s+$/g,'&nbsp;');
					}
					else {
						span.innerHTML = txt;
					}
					o.replaceChild(span, node);
				}
			}
		}
    };

	function _replace_tree(o, options) {
		if(typeof __flir_replacetree_recurse == 'undefined') {
			__flir_replacetree_recurse = 1;
		}
		else {
			__flir_replacetree_recurse++;
		}
		
		if(__flir_replacetree_recurse>1000) {
		    console.error('Facelift: Too much recursion.');
		    return;
		}
		
		var objs = !o.hasChildNodes() || (o.hasChildNodes() && o.childNodes.length==1 && o.childNodes[0].nodeType==3) ? [o] : o.childNodes;
		
		var rep_obj;

		for(var i=0; i < objs.length; i++) {
		    rep_obj = objs[i];

		    if($(rep_obj).is('br,hr,img,input,select')) continue;

			if(rep_obj.hasChildNodes() && (rep_obj.childNodes.length > 1 || rep_obj.childNodes[0].nodeType != 3)) {
			    prepare(rep_obj);
			    _replace_tree(rep_obj, options);
			    continue;
			}
			
			if(rep_obj.innerHTML == '') continue; // skip empty tags, if they exist


			if(jQuery.browser.msie && /^6/.test(jQuery.browser.version)) {
				replaceMethodCraptastic(rep_obj,options);
			}
			else {
				replaceMethodOverlay(rep_obj,options);
			}
			
			rep_obj.className += ' flir-replaced';
		}
	};

	function replaceMethodOverlay(o,options) {
		var img = document.createElement('IMG');
		img.alt = sanitizeHTML(o.innerHTML);

		if(img.onerror) {
			img.onerror = function() {
				var span = document.createElement('SPAN');
				span.innerHTML = img.alt;
				try {
					o.replaceChild(span,img)
				}catch(err) { }
			};
		}

		img.flirImage = true;
		img.className = 'flir-image';
		img.src = generateURL(o,options);
		img.style.border='none';
		o.innerHTML='';
		o.appendChild(img);
    }

	function replaceMethodCraptastic(o,options) {
		var url = generateURL(o,options);

		var img = document.createElement('IMG');
		img.alt = sanitizeHTML(o.innerHTML);        

		img.flirImage = true;
		img.className = 'flir-image';
		img.src = options.path+'spacer.png';
		img.style.width=o.offsetWidth+'px';
		img.style.height=o.offsetHeight+'px';
		img.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="'+url+'", sizingMethod="image")';

		o.innerHTML='';
		o.appendChild(img);
	}

	function generateURL(el,options) { // [, text]
		var enc_text = el.innerHTML;
		var transform = $(el).css('text-transform');

		switch(transform) {
			case 'capitalize':
				enc_text = enc_text.replace(/\w+/g, function(w){
					return w.charAt(0).toUpperCase() + w.substr(1).toLowerCase();
				});
				break;
			case 'lowercase':
				enc_text = enc_text.toLowerCase();
				break;
			case 'uppercase':
				enc_text = enc_text.toUpperCase().replace(/&[a-z0-9]+;/gi, function(m) { return m.toLowerCase(); }); // keep entities lowercase, numeric don't matter
				break;
		}

		enc_text = encodeURIComponent(enc_text.replace(/&/g, '{amp}').replace(/\+/g, '{plus}'));

		if(jQuery.browser.msie && /^6/.test(jQuery.browser.version)) {
			enc_text = escape(enc_text);
		}

		return options.path+'generate.php?text='+enc_text+'&h='+el.offsetHeight+'&w='+el.offsetWidth+'&fstyle='+serialize(el,options);
	};

	function serialize(el,opts) {
		var sdata='';

		var options = {
			mode: '', // none (''), wrap,progressive or name of a plugin
			output:'auto', // auto, png, gif, jpg
			realFontHeight: false,
			dpi: 96
		}

		options.cSize = getSize(el);
		options.cColor = getColor(el);
		if(opts.font) {
			options.cFont = opts.font;
		}
		else {
			options.cFont = $(el).css('font-family').split(',')[0].replace(/['"]/g, '').toLowerCase();
		}
		options.cLine = getLineHeight(el,options);
		options.cSpacing = getSpacing(el,options);
		options.cBackground = $(el).css('background-color');
		options.cAlign = $(el).css('text-align');
		options.cTransform = $(el).css('text-transform');
		//options.cWeight = getWeight(el);
		//options.cFontStyle = $(el).css('font-style');

		for(var i in options) {
			if(options[i] == null || typeof options[i] == 'undefined' || options[i] == 'NaN')
				continue;
			sdata += ',"'+i+'":"'+options[i].toString().replace(/"/g, "'")+'"';
		}

		sdata = '{'+sdata.substr(1)+'}';
	
		return escape(sdata);
	};

	function getLineHeight(o,options) {
	    var spacing = $(o).css('line-height');
	    var fontsize = options.cSize;
	    var val = parseFloat(spacing);

		if(spacing.indexOf('em') > -1) {
			ret = (val*fontsize)/fontsize;
		}
		else if(spacing.indexOf('px') > -1) {
			ret = val/fontsize;
		}
		else if(spacing.indexOf('pt') > -1) {
			var pts = val;
			ret = (pts/(72/options.dpi))/fontsize;
		}
		else if(spacing.indexOf('%') > -1) {
			return 1.0;    
		}
		else {
	    	ret = val;    
	    }
	    
		return roundFloat(ret);
	};

	function getWeight(o) { 
		var fontweight = $(o).css('font-weight');

		switch(fontweight.toString()) {
			case '100': case '200': case '300': case 'lighter':
				return 'lighter';
			case '400': case 'normal':
				return '';
			case '500': case '600': case '700': case 'bold':
				return 'bold';
			case '800': case '900': case 'bolder':
				return 'bolder';
		}
	};

	function getColor(o) { 
		var color = $(o).css('color');
		if(color.substr(0, 1)=='#') {
			color = color.substr(1);
		}

		return color.replace(/['"]/g, '').toLowerCase();
	};
	
	function getSize(o) {
		return calcFontSize(o);
		//return Math.round(parseFloat($(o).css('font-size')));
	};
	
	function getSpacing(o,options) {
		var spacing = $(o).css('letter-spacing');
		var fontsize = options.cSize;
		var ret;
		if(spacing != 'normal') {
			if(spacing.indexOf('em') > -1) {
				ret = (parseFloat(spacing)*fontsize);
			}
			else if(spacing.indexOf('px') > -1) {
				ret = parseFloat(spacing);
			}
			else if(spacing.indexOf('pt') > -1) {
				var pts = parseFloat(spacing);
				ret = pts/(72/options.dpi);            
	        }

	        return roundFloat(ret);
	    }
	
	    return '';    
	};

	function sanitizeHTML(html) {
		return html.replace(/<[^>]+>/g, '');
	}

	function roundFloat(val) {
		return Math.round(val*10000)/10000;
	};

	function calcFontSize(o) {
		var test = document.createElement('DIV');
		test.style.border = '0';
		test.style.padding = '0';
		test.style.position='absolute';
		test.style.visibility='hidden';
		test.style.left=test.style.top='-1000px';
		test.style.left=test.style.top='10px';
		test.style.lineHeight = '100%';
		test.innerHTML = 'Flir_Test';        
		o.appendChild(test);

		var size = test.offsetHeight;
		o.removeChild(test);

		return size;
	};
})(jQuery);