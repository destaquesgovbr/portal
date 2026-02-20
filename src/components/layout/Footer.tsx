import { ExternalLink, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="layout-footer relative">
      {/* Conteúdo principal */}
      <div className="bg-government-gray border-t pt-12 pb-8">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 md:gap-24">
          {/* Government info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src="/logo.png"
                width={100}
                height={100}
                alt="Selo do Governo Federal"
              />
              <div>
                <h3 className="font-semibold text-primary text-lg">
                  Governo Federal do Brasil
                </h3>
                <p className="text-sm text-muted-foreground">
                  Portal de Notícias Oficiais
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Este portal é mantido pelo Governo Federal do Brasil e apresenta
              notícias oficiais sobre as ações e políticas públicas
              implementadas pelos órgãos governamentais.
            </p>

            <div className="space-y-2 text-sm text-foreground">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>Brasília - DF, Brasil</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>0800 123 4567</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 md:mt-0">
            <h4 className="font-semibold mb-4 text-primary">Acesso Rápido</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.gov.br/"
                  target="_blank"
                  className="hover:text-government-blue hover:underline transition-colors flex items-center"
                  rel="noopener"
                >
                  GOV.BR
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>
                <a
                  href="https://portaldatransparencia.gov.br/"
                  target="_blank"
                  className="hover:text-government-green hover:underline transition-colors flex items-center"
                  rel="noopener"
                >
                  Transparência
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.gov.br/ouvidorias"
                  target="_blank"
                  className="hover:text-government-red hover:underline transition-colors flex items-center"
                  rel="noopener"
                >
                  Ouvidoria
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider and copyright */}
        <div className="border-t mt-12 pt-6 text-center text-sm text-muted-foreground">
          <p>
            © {currentYear} Governo Federal do Brasil. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
