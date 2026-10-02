package auth

import (
	"context"
	"errors"
	"net"
	"net/mail"
	"strings"
)

func emailDomainCanReceiveMail(ctx context.Context, email string) (bool, error) {
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return false, nil
	}

	separator := strings.LastIndexByte(address.Address, '@')
	if separator <= 0 || separator == len(address.Address)-1 {
		return false, nil
	}
	domain := address.Address[separator+1:]

	resolver := net.DefaultResolver
	mailExchanges, err := resolver.LookupMX(ctx, domain)
	if err == nil && len(mailExchanges) > 0 {
		return true, nil
	}
	if err != nil && !isDNSNotFound(err) {
		return false, err
	}

	// RFC 5321 permits an address record as an implicit MX when no MX exists.
	addresses, err := resolver.LookupIPAddr(ctx, domain)
	if err != nil {
		if isDNSNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return len(addresses) > 0, nil
}

func isDNSNotFound(err error) bool {
	var dnsError *net.DNSError
	return errors.As(err, &dnsError) && dnsError.IsNotFound
}
