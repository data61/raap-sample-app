(function() {
	'use strict'
	var baseURL = 'https://raap.d61.io/api/v0'

	
	var auth = (function() {
		var token = null;

		return {
			signIn: function(email, password) {
				return m.request({
					method: 'POST',
					url: baseURL + '/user/token',
					headers: {
						'Authorization': 'Basic ' + btoa(email + ':' + password)
					}
				})
					.then(function(tk) {
						return token = tk
					})
					.catch(function(e) {
						alert('Could not sign in: ' + e.message)
					})
			},
			getToken: function() { return token }
		}
	})();
	
	var signIn = {
		oninit: function(v) {
			v.state.email = ''
			v.state.password = ''
			v.state.submit = function() {
				auth
					.signIn(v.state.email, v.state.password)
					.then(function() {
						m.route.set('/')
					})
			}
		},
		view: function(v) {
			return m('main', [
				m('form', { onsubmit: v.state.submit }, [
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
			return m('p', auth.getToken())
		}
	}


	document.addEventListener('DOMContentLoaded', function(event) {
		m.route(document.body, '/sign-in', {
			'/': demo,
			'/sign-in': signIn
		})
	});
})();
