(function() {
	'use strict'
	var baseURL = '/api/v0'
	var DOMAIN = 'demonstration'
	var delegate = function(h) { return function(e) { e.preventDefault(); h(e) } }
	
	var api = (function() {
		var token = null;
		var getHeaders = function() { return { 'Authorization': 'Bearer ' + token } }
		return {
			signIn: function(email, password) {
				return m.request({ method: 'POST', url: baseURL + '/user/token', headers: {
					'Authorization': 'Basic ' + btoa(email + ':' + password)
				}})
					.then(function(tk) {
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
				return m.request({ method: 'POST', url: baseURL + '/domain/'+DOMAIN+'/reason', data: values, headers: getHeaders()})
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
			return m('main', [
				m('form', { onsubmit: delegate(v.state.submit) }, [
					m('label', [
						'Email',
						m('input', { type: 'email', onchange: m.withAttr('value', function(x) { v.state.email = x }), value: v.state.email })
					]),
					m('label', [
						'Password',
						m('input', { type: 'password', onchange: m.withAttr('value', function(x) { v.state.password = x }), value: v.state.password })
					]),
					m('input', { type: 'submit' } )
				])
			])
		}
	}
		
	var demo = {
		view: function(v) {
			return m('main.columns', [
				m('.column.input', m('div', v.attrs.atoms.map(function(a) { return m('div', a.name) }))),
				m('.column.output', m('div', 'output'))
			])
		}
	}


	document.addEventListener('DOMContentLoaded', function(event) {
		m.route(document.body, '/sign-in', {
			'/': {
				onmatch: api.getAtoms,
				render: function(v) { return m(demo, { atoms: v.state }) }
			},
			'/sign-in': signIn
		})
	});
})();
