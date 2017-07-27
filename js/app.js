(function() {
	'use strict'
	var baseURL = 'https://raap.d61.io/api/v0';
	var DOMAIN = 'demonstration';
	var GOAL_ID = 'escalator.operation';
	var PERMITTED = 'PERMITTED';
  var OBLIGATED = 'OBLIGATED';
	var FORBIDDEN = 'FORBIDDEN';
	var UNKNOWN = 'UNKNOWN';
	var CONCLUSIVE = 'CONCLUSIVE';
	var STORAGE_KEY = 'raap_demo';

	var delegate = function(h) { return function(e) { e.preventDefault(); h(e) } }

	var api = (function() {
		var token = window.sessionStorage.getItem(STORAGE_KEY);
		var getHeaders = function() { return { 'Authorization': 'Bearer ' + token } }
		return {
			isSignedIn: function() {
				return token !== null;
			},
			signIn: function(email, password) {
				return m.request({ method: 'POST', url: baseURL + '/user/token', headers: {
					'Authorization': 'Basic ' + btoa(email + ':' + password)
				}})
					.then(function(tk) {
						window.sessionStorage.setItem(STORAGE_KEY, tk)
						return token = tk
					})
					.catch(function(e) {
						alert('Could not sign in: ' + e.message)
						throw e
					})
			},
			getAtoms: function() {
				return m.request({ method: 'GET', url: baseURL + '/domain/'+DOMAIN+'/schema', headers: getHeaders()})
			},
			reason: function(values) {
				return m.request({ method: 'POST', url: baseURL + '/domain/'+DOMAIN+'/reasoning/reason?criteria=draft&known-results-only', data: values, headers: getHeaders()})
			}
		}
	})();

	var signIn = {
		oninit: function(v) {
			v.state.email = ''
			v.state.password = ''
			v.state.submit = function() {
				api
					.signIn(v.state.email, v.state.password)
					.then(function() {
						m.route.set('/')
					})
			}
		},
		view: function(v) {
			return m('main.centered', [
				m('form.box', { onsubmit: delegate(v.state.submit) }, [
					m('.panel', m('h2', 'Sign in')),
					m('label', [
						'Email',
						m('input', { type: 'email', oninput: m.withAttr('value', function(x) { v.state.email = x }), value: v.state.email })
					]),
					m('label', [
						'Password',
						m('input', { type: 'password', oninput: m.withAttr('value', function(x) { v.state.password = x }), value: v.state.password })
					]),
					m('.panel.centered', m('input', { type: 'submit', value: 'Sign in' } ))
				])
			])
		}
	}

	// Takes an object 'o', a JavaScript object path 'p' and updates the object with value 'v'.
	// 
	// Example:
	// set({}, 'foo.bar.hello', 'world') == { 'foo': { 'bar': { 'hello': 'world' } } }
	var set = function(o, p, v) {
		var i = p.indexOf('.');
		if (i > -1) {
			var k = p.substring(0, i);
			o[k] = set(o[k] === undefined ? {} : o[k], p.substring(i+1), v)
		} else {
			o[p] = v;
		}
		return o
	}

	var demo = {
		oninit: function(v) {
			v.state.atoms = [];
			v.state.response = [];
			v.state.result = '';

			if (!api.isSignedIn()) {
				m.route.set('/sign-in')
				return
			}

			api.getAtoms().then(x => v.state.atoms = x)

			v.state.reasoning = false;
			v.state.reason = function(e) {
				v.state.reasoning = true;

				var data = v.state.atoms.reduce(function(result, atom) {
					return (atom.value === undefined ? result : set(result, atom.name, atom.value))
				}, {})

				api
					.reason(data)
					.then(function(response) {
						v.state.reasoning = false
						v.state.response = response
					})
					.catch(function(err) {
						v.state.reasoning = false
						alert('Unable to reason at this time: ' + err.message)
						throw err
					})

			}
		},
		view: function(v) {
			return m('main.columns', [
				m('.column.box.grow', v.state.atoms.map(function(x) { return m(atom, { atom: x }) })),
				m('.column.centered',
					m('a.button',
						{ onclick: v.state.reason, class: v.state.reasoning ? 'busy' : '' },
						m('i.fa.fa-3x.fa-fw.fa-cog', { class: v.state.reasoning ? 'fa-spin' : '' }))),
				m('.column.box.grow', m(result, { response: v.state.response }))
			])
		}
	};

	var controls = {
		'BOOL': {
			view: function(v) {
				var icon = v.attrs.atom.value === true ? 'fa-toggle-on' : 'fa-toggle-off';
				return m(
					'a',
					{ onclick: function() { v.attrs.atom.value = !v.attrs.atom.value } },
					m('i.fa.fa.fa-lg.' + icon, { class: v.attrs.atom.value === undefined ? 'grey' : '' }))
			}
		},
		'NUMERIC': {
			view: function(v) {
				return m('input.inline', {
					type: 'number',
					placeholder: '_',
					value: v.attrs.atom.value,
					oninput: m.withAttr('value', function(x) {
						let f = parseFloat(x)
						if (f !== NaN) {
							v.attrs.atom.value = f
						}
					})
				})
			}
		},
		'DATE': {
			view: function(v) {
				return m('input.inline', {
					type: 'date',
					value: v.attrs.atom.value,
					oninput: m.withAttr('value', function(x) { v.attrs.atom.value = x })
				})
			}
		}
	}

	var atom = {
		view: function(v) {
			return m('div.row', [
				m('.grow', [
					v.attrs.atom.value === undefined ? null :	m('a', { onclick: function() { delete v.attrs.atom.value } }, m('i.fa.fa-fw.fa-trash-o')),
					v.attrs.atom.description || v.attrs.atom.name
				]),
				m(controls[v.attrs.atom.atomType], { atom: v.attrs.atom })
			])
		}
	}

	var picture = {
		onupdate: function(v) {
			let a = v.dom.querySelector('animate')
			if (a) {
				a.beginElement();
			}
		},
		view: function(v) {
			return m('div.picture', v.attrs.status === UNKNOWN ? null : [
				m('svg', { style: { height: '256px', padding: '1em' }, viewBox: '0 0 3 3' },
					m('polygon', { fill: '#228562' },
						m('animate', { begin: '0s', dur: v.attrs.status === PERMITTED ? '1s' : '0', repeatCount: 'indefinite', keyTimes: '0;1', attributeName: 'points', values: '3,0 2,0 2,1 1,1 1,2 0,2 0,3 0,3 0,3 3,3;3,0 3,0 3,0 2,0 2,1 1,1 1,2 0,2 0,3 3,3' })))
			])
		}
	}

	var result = {
		view: function(v) {
      var status = UNKNOWN;
      var escalator = v.attrs.response.escalator;

      if (escalator && escalator.operation) {
        var permitted = escalator.operation.find(x => x.goal.modality === PERMITTED);
        var obligatedNotTo = escalator.operation.find(x => x.goal.modality === OBLIGATED && x.goal.negated === true);
      }

			status = (permitted) ? PERMITTED : ((obligatedNotTo) ? FORBIDDEN : UNKNOWN);

			return [
				m('.row.result.centered', m(picture, { status: status })),
				m('.row.centered', m('h2', 'Escalator operation is ' + status)),
				m('.row', '')
			]
		}
	}

	document.addEventListener('DOMContentLoaded', function(event) {
		m.route(document.body, '/sign-in', {
			'/': demo,
			'/sign-in': signIn
		})
	});
})();
